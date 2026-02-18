#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PNPM_TARGET_VERSION="10.28.2"

if [ "$(id -u)" -ne 0 ]; then
    SUDO="sudo"
else
    SUDO=""
fi

log() {
    printf '[setup] %s\n' "$1"
}

warn() {
    printf '[warn] %s\n' "$1"
}

fail() {
    printf '[fail] %s\n' "$1" >&2
    exit 1
}

have() {
    command -v "$1" >/dev/null 2>&1
}

linux_arch() {
    case "$(uname -m)" in
        x86_64) echo "amd64" ;;
        aarch64|arm64) echo "arm64" ;;
        *) fail "unsupported architecture: $(uname -m)" ;;
    esac
}

version_ge() {
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

detect_os() {
    if [ ! -f /etc/os-release ]; then
        fail "unable to detect OS (/etc/os-release not found)"
    fi

    # shellcheck disable=SC1091
    . /etc/os-release

    OS_ID="${ID:-}"
    OS_VERSION_ID="${VERSION_ID:-}"
    OS_CODENAME="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"

    if [ -z "$OS_ID" ]; then
        fail "unable to detect Linux distribution ID"
    fi
}

apt_update_once() {
    if [ "${APT_UPDATED:-0}" = "1" ]; then
        return
    fi
    log "running apt-get update"
    $SUDO apt-get update
    APT_UPDATED=1
}

apt_install() {
    apt_update_once
    $SUDO apt-get install -y "$@"
}

ensure_node_repo() {
    local major="$1"
    local list="/etc/apt/sources.list.d/nodesource.list"

    if [ -f "$list" ] && grep -q "node_${major}.x" "$list"; then
        return
    fi

    log "configuring NodeSource repository for Node.js ${major}.x"
    apt_install ca-certificates curl gnupg
    $SUDO mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor \
        | $SUDO tee /etc/apt/keyrings/nodesource.gpg >/dev/null
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${major}.x nodistro main" \
        | $SUDO tee "$list" >/dev/null
    APT_UPDATED=0
}

ensure_hashicorp_repo() {
    local list="/etc/apt/sources.list.d/hashicorp.list"

    if [ -f "$list" ]; then
        return
    fi

    log "configuring HashiCorp repository"
    apt_install ca-certificates curl gnupg lsb-release
    $SUDO mkdir -p /etc/apt/keyrings
    curl -fsSL https://apt.releases.hashicorp.com/gpg \
        | gpg --dearmor \
        | $SUDO tee /etc/apt/keyrings/hashicorp-archive-keyring.gpg >/dev/null
    echo "deb [signed-by=/etc/apt/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com ${OS_CODENAME:-$(lsb_release -cs)} main" \
        | $SUDO tee "$list" >/dev/null
    APT_UPDATED=0
}

ensure_go_toolchain() {
    local required_go
    required_go="$(awk '/^go / {print $2; exit}' "$REPO_ROOT/go.mod")"
    [ -n "$required_go" ] || fail "unable to parse Go version from go.mod"

    if have go; then
        local current_go
        current_go="$(go version | awk '{print $3}' | sed 's/^go//')"
        if version_ge "$current_go" "$required_go"; then
            log "Go ${current_go} satisfies required ${required_go}"
            return
        fi
        warn "Go ${current_go} is below required ${required_go}; upgrading"
    else
        log "Go not found; installing Go ${required_go}"
    fi

    local arch go_tar tmp
    arch="$(linux_arch)"
    go_tar="go${required_go}.linux-${arch}.tar.gz"
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' RETURN

    curl -fsSL "https://go.dev/dl/${go_tar}" -o "$tmp/$go_tar"
    $SUDO rm -rf /usr/local/go
    $SUDO tar -C /usr/local -xzf "$tmp/$go_tar"

    export PATH="/usr/local/go/bin:$PATH"
    if ! grep -q '/usr/local/go/bin' "$HOME/.bashrc" 2>/dev/null; then
        printf '\nexport PATH="/usr/local/go/bin:$PATH"\n' >> "$HOME/.bashrc"
    fi

    local installed
    installed="$(go version | awk '{print $3}' | sed 's/^go//')"
    log "installed Go ${installed}"
}

ensure_pnpm() {
    if ! have corepack; then
        fail "corepack is not available even after Node.js install"
    fi

    corepack enable
    corepack prepare "pnpm@${PNPM_TARGET_VERSION}" --activate

    if ! have pnpm; then
        fail "pnpm activation failed"
    fi

    log "pnpm $(pnpm --version) ready"
}

install_system_packages() {
    log "installing base system packages"
    apt_install \
        build-essential \
        ca-certificates \
        curl \
        direnv \
        git \
        gnupg \
        jq \
        lsb-release \
        lz4 \
        make \
        pkg-config \
        pv \
        tar \
        unzip \
        wget \
        xz-utils
}

ensure_node_runtime() {
    local required_major=22
    local node_major=0

    if have node; then
        node_major="$(node -v | sed 's/^v//' | cut -d. -f1)"
    fi

    if [ "$node_major" -lt "$required_major" ]; then
        log "installing/upgrading Node.js to ${required_major}.x (current: ${node_major})"
        ensure_node_repo "$required_major"
        apt_install nodejs
    fi

    have node || fail "node installation failed"
    have npm || fail "npm installation failed"

    log "node $(node -v), npm $(npm -v)"
}

ensure_terraform() {
    if have terraform; then
        log "terraform $(terraform version -json 2>/dev/null | jq -r '.terraform_version' 2>/dev/null || terraform version | head -n1)"
        return
    fi

    log "installing terraform"
    ensure_hashicorp_repo
    apt_install terraform
    have terraform || fail "terraform installation failed"
}

setup_repo_tooling() {
    prepare_repo_make_env

    log "configuring repository git hooks"
    make -C "$REPO_ROOT" setup-hooks

    log "installing repo cached tooling (golangci-lint, gitleaks, etc.)"
    make -C "$REPO_ROOT" cache
}

prepare_repo_make_env() {
    export VE_DIRENV_SET=1
    export VE_ROOT="$REPO_ROOT"
    export ROOT_DIR="$REPO_ROOT"

    export VE_DEVCACHE="${VE_DEVCACHE:-$REPO_ROOT/.cache}"
    export VE_DEVCACHE_BIN="${VE_DEVCACHE_BIN:-$VE_DEVCACHE/bin}"
    export VE_DEVCACHE_INCLUDE="${VE_DEVCACHE_INCLUDE:-$VE_DEVCACHE/include}"
    export VE_DEVCACHE_VERSIONS="${VE_DEVCACHE_VERSIONS:-$VE_DEVCACHE/versions}"
    export VE_DEVCACHE_NODE_MODULES="${VE_DEVCACHE_NODE_MODULES:-$VE_DEVCACHE/node_modules}"
    export VE_RUN="${VE_RUN:-$REPO_ROOT/_run}"
    export VE_RUN_BIN="${VE_RUN_BIN:-$VE_RUN/bin}"

    if [ -x "$REPO_ROOT/script/tools.sh" ]; then
        GOTOOLCHAIN="$($REPO_ROOT/script/tools.sh gotoolchain 2>/dev/null || true)"
    fi
    export GOTOOLCHAIN="${GOTOOLCHAIN:-auto}"

    if have direnv && [ -f "$REPO_ROOT/.envrc" ]; then
        log "loading repository environment via direnv"
        if direnv_env="$(cd "$REPO_ROOT" && direnv allow . >/dev/null 2>&1 && direnv export bash 2>/dev/null)"; then
            eval "$direnv_env"
        else
            warn "direnv export failed; using bootstrap fallback environment"
        fi
    else
        warn "direnv or .envrc not available; using bootstrap fallback environment"
    fi

    if [ -z "${GOTOOLCHAIN:-}" ] && [ -x "$REPO_ROOT/script/tools.sh" ]; then
        GOTOOLCHAIN="$($REPO_ROOT/script/tools.sh gotoolchain 2>/dev/null || true)"
    fi
    export GOTOOLCHAIN="${GOTOOLCHAIN:-auto}"
}

install_js_deps() {
    log "installing workspace pnpm packages"
    if ! (cd "$REPO_ROOT" && pnpm install --frozen-lockfile); then
        warn "pnpm install --frozen-lockfile failed, retrying without frozen lockfile"
        (cd "$REPO_ROOT" && pnpm install)
    fi

    if [ -f "$REPO_ROOT/sdk/ts/package.json" ]; then
        log "installing sdk/ts packages"
        if ! pnpm -C "$REPO_ROOT/sdk/ts" install --frozen-lockfile; then
            warn "sdk/ts frozen lockfile install failed, retrying"
            pnpm -C "$REPO_ROOT/sdk/ts" install
        fi
    fi
}

warm_go_modules() {
    log "downloading Go modules"
    (cd "$REPO_ROOT" && go mod download)
}

main() {
    if [ ! -f "$REPO_ROOT/go.mod" ] || [ ! -f "$REPO_ROOT/pnpm-workspace.yaml" ]; then
        fail "this script must be run from the VirtEngine repository"
    fi

    detect_os
    case "$OS_ID" in
        ubuntu|debian)
            ;;
        *)
            fail "unsupported distro '$OS_ID'. This bootstrap currently supports Ubuntu/Debian."
            ;;
    esac

    install_system_packages
    ensure_node_runtime
    ensure_pnpm
    ensure_terraform
    ensure_go_toolchain
    setup_repo_tooling
    install_js_deps
    warm_go_modules

    log "environment bootstrap complete"
    log "restart your shell (or run: source ~/.bashrc) to pick up PATH changes"
}

main "$@"