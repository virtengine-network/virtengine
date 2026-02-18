/**
 * Copyright (c) VirtEngine, Inc.
 * SPDX-License-Identifier: BSL-1.1
 */

import type { Metadata } from 'next';
import { InvoiceDetailPage } from './InvoiceDetailPage';

export const metadata: Metadata = {
  title: 'Invoice Detail',
  description: 'View invoice details, line items, and payment history',
};

export default async function InvoiceDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetailPage invoiceId={id} />;
}
