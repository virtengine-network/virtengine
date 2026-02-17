import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());
const loadConfigMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

vi.mock("../config.mjs", () => ({
  loadConfig: loadConfigMock,
}));

const { getKanbanAdapter, setKanbanBackend, getKanbanBackendName } =
  await import("../kanban-adapter.mjs");
const {
  configureTaskStore,
  loadStore,
  addTask,
  removeTask,
  getTask,
} = await import("../task-store.mjs");
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

function mockGh(stdout, stderr = "") {
  execFileMock.mockImplementationOnce((_cmd, _args, _opts, cb) => {
    cb(null, { stdout, stderr });
  });
}

describe("kanban-adapter github backend", () => {
  const originalRepo = process.env.GITHUB_REPOSITORY;
  const originalOwner = process.env.GITHUB_REPO_OWNER;
  const originalName = process.env.GITHUB_REPO_NAME;
  const originalProjectMode = process.env.GITHUB_PROJECT_MODE;
  const originalTaskLabelEnforce = process.env.CODEX_MONITOR_ENFORCE_TASK_LABEL;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_REPO_OWNER;
    delete process.env.GITHUB_REPO_NAME;
    process.env.GITHUB_PROJECT_MODE = "issues";
    process.env.CODEX_MONITOR_ENFORCE_TASK_LABEL = "true";
    loadConfigMock.mockReturnValue({
      repoSlug: "acme/widgets",
      kanban: { backend: "github" },
    });
    setKanbanBackend("github");
  });

  afterEach(() => {
    if (originalRepo === undefined) {
      delete process.env.GITHUB_REPOSITORY;
    } else {
      process.env.GITHUB_REPOSITORY = originalRepo;
    }
    if (originalOwner === undefined) {
      delete process.env.GITHUB_REPO_OWNER;
    } else {
      process.env.GITHUB_REPO_OWNER = originalOwner;
    }
    if (originalName === undefined) {
      delete process.env.GITHUB_REPO_NAME;
    } else {
      process.env.GITHUB_REPO_NAME = originalName;
    }
    if (originalProjectMode === undefined) {
      delete process.env.GITHUB_PROJECT_MODE;
    } else {
      process.env.GITHUB_PROJECT_MODE = originalProjectMode;
    }
    if (originalTaskLabelEnforce === undefined) {
      delete process.env.CODEX_MONITOR_ENFORCE_TASK_LABEL;
    } else {
      process.env.CODEX_MONITOR_ENFORCE_TASK_LABEL = originalTaskLabelEnforce;
    }
  });

  it("uses repo slug from config when owner/repo env vars are not set", async () => {
    mockGh("[]");
    const adapter = getKanbanAdapter();
    await adapter.listTasks("ignored-project-id", { status: "todo", limit: 5 });

    const call = execFileMock.mock.calls[0];
    expect(call).toBeTruthy();
    const args = call[1];
    expect(args).toContain("--repo");
    expect(args).toContain("acme/widgets");
  });

  it("handles non-JSON output for issue close and then fetches updated issue", async () => {
    mockGh("✓ Closed issue #42");
    mockGh(
      JSON.stringify({
        number: 42,
        title: "example",
        body: "",
        state: "closed",
        url: "https://github.com/acme/widgets/issues/42",
        labels: [],
        assignees: [],
      }),
    );
    mockGh("[]");

    const adapter = getKanbanAdapter();
    const task = await adapter.updateTaskStatus("42", "cancelled");

    expect(task?.id).toBe("42");
    expect(task?.status).toBe("done");

    const closeCallArgs = execFileMock.mock.calls[0][1];
    expect(closeCallArgs).toContain("close");
    expect(closeCallArgs).toContain("--reason");
    expect(closeCallArgs).toContain("not planned");
  });

  it("creates issue from URL output and resolves it via issue view", async () => {
    mockGh('{"name":"codex-monitor"}\n');
    mockGh("https://github.com/acme/widgets/issues/55\n");
    mockGh(
      JSON.stringify({
        number: 55,
        title: "new task",
        body: "desc",
        state: "open",
        url: "https://github.com/acme/widgets/issues/55",
        labels: [],
        assignees: [],
      }),
    );
    mockGh("[]");

    const adapter = getKanbanAdapter();
    const task = await adapter.createTask("ignored-project-id", {
      title: "new task",
      description: "desc",
    });

    expect(task?.id).toBe("55");
    expect(task?.taskUrl).toBe("https://github.com/acme/widgets/issues/55");
    expect(getKanbanBackendName()).toBe("github");

    const issueCreateCall = execFileMock.mock.calls.find(
      (call) =>
        Array.isArray(call[1]) &&
        call[1].includes("issue") &&
        call[1].includes("create"),
    );
    expect(issueCreateCall).toBeTruthy();
    expect(issueCreateCall[1]).toContain("--label");
    expect(issueCreateCall[1]).toContain("codex-monitor");
    expect(issueCreateCall[1]).toContain("--assignee");
    expect(issueCreateCall[1]).toContain("acme");
  });

  it("filters listTasks to codex-scoped labels when enforcement is enabled", async () => {
    mockGh(
      JSON.stringify([
        {
          number: 10,
          title: "scoped",
          body: "",
          state: "open",
          url: "https://github.com/acme/widgets/issues/10",
          labels: [{ name: "codex-monitor" }],
          assignees: [],
        },
        {
          number: 11,
          title: "unscoped",
          body: "",
          state: "open",
          url: "https://github.com/acme/widgets/issues/11",
          labels: [{ name: "bug" }],
          assignees: [],
        },
      ]),
    );
    mockGh("[]");

    const adapter = getKanbanAdapter();
    const tasks = await adapter.listTasks("ignored-project-id", {
      status: "todo",
      limit: 25,
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe("10");
  });

  it("addComment posts a comment on a github issue", async () => {
    mockGh("ok");

    const adapter = getKanbanAdapter();
    const result = await adapter.addComment("42", "Hello from CI");

    expect(result).toBe(true);
    const call = execFileMock.mock.calls[0];
    const args = call[1];
    expect(args).toContain("issue");
    expect(args).toContain("comment");
    expect(args).toContain("42");
    expect(args).toContain("--body");
    expect(args).toContain("Hello from CI");
  });

  it("addComment returns false for invalid issue number", async () => {
    const adapter = getKanbanAdapter();
    const result = await adapter.addComment("not-a-number", "body");
    expect(result).toBe(false);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("addComment returns false when body is empty", async () => {
    const adapter = getKanbanAdapter();
    const result = await adapter.addComment("42", "");
    expect(result).toBe(false);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("addComment returns false when gh CLI fails", async () => {
    execFileMock.mockImplementationOnce((_cmd, _args, _opts, cb) => {
      cb(new Error("network error"), { stdout: "", stderr: "" });
    });

    const adapter = getKanbanAdapter();
    const result = await adapter.addComment("42", "test body");
    expect(result).toBe(false);
  });
});

describe("kanban-adapter vk backend fallback fetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    loadConfigMock.mockReturnValue({
      vkEndpointUrl: "http://127.0.0.1:54089",
      kanban: { backend: "vk" },
    });
    setKanbanBackend("vk");
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws a descriptive error for invalid fetch response objects", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(undefined);

    const adapter = getKanbanAdapter();
    await expect(
      adapter.listTasks("proj-1", { status: "todo" }),
    ).rejects.toThrow(/invalid response object/);
  });

  it("accepts JSON payloads mislabeled as text/plain", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "text/plain"]]),
      text: async () =>
        JSON.stringify({
          data: [{ id: "task-1", title: "Task One", status: "todo" }],
        }),
    });

    const adapter = getKanbanAdapter();
    const tasks = await adapter.listTasks("proj-1", { status: "todo" });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "task-1",
      title: "Task One",
      status: "todo",
      backend: "vk",
    });
  });
});

describe("kanban-adapter internal backend", () => {
  const originalKanbanBackend = process.env.KANBAN_BACKEND;
  let tempDir = "";

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = mkdtempSync(resolve(tmpdir(), "codex-monitor-internal-kanban-"));
    configureTaskStore({ baseDir: tempDir });
    loadStore();
    process.env.KANBAN_BACKEND = "internal";
    loadConfigMock.mockReturnValue({
      kanban: { backend: "internal" },
    });
    setKanbanBackend("internal");
  });

  afterEach(() => {
    if (originalKanbanBackend === undefined) {
      delete process.env.KANBAN_BACKEND;
    } else {
      process.env.KANBAN_BACKEND = originalKanbanBackend;
    }
  });

  it("uses internal backend by default when configured", () => {
    expect(getKanbanBackendName()).toBe("internal");
  });

  it("creates, lists, updates, comments, and deletes internal tasks", async () => {
    const adapter = getKanbanAdapter();

    const created = await adapter.createTask("internal", {
      title: "Internal task",
      description: "Local source-of-truth task",
      status: "todo",
    });
    expect(created.backend).toBe("internal");
    expect(created.id).toBeTruthy();

    const listed = await adapter.listTasks("internal", { status: "todo" });
    expect(listed.some((task) => task.id === created.id)).toBe(true);

    const updated = await adapter.updateTaskStatus(created.id, "inprogress");
    expect(updated.status).toBe("inprogress");

    const commented = await adapter.addComment(created.id, "review me");
    expect(commented).toBe(true);
    const fromStore = getTask(created.id);
    expect(Array.isArray(fromStore?.meta?.comments)).toBe(true);
    expect(fromStore.meta.comments.length).toBeGreaterThan(0);

    const deleted = await adapter.deleteTask(created.id);
    expect(deleted).toBe(true);
    expect(removeTask(created.id)).toBe(false);
  });
});
