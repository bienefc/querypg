import { Dataset } from '@/types';

const cache: Record<string, Dataset> = {};

export async function loadDataset(id: string): Promise<Dataset> {
  if (cache[id]) return cache[id];
  const res = await fetch(`/datasets/${id}.json`);
  if (!res.ok) throw new Error(`Dataset "${id}" not found`);
  const data: Dataset = await res.json();
  cache[id] = data;
  return data;
}

export async function loadAllDatasets(): Promise<Dataset[]> {
  const ids = ['ecommerce', 'hr'];
  return Promise.all(ids.map(loadDataset));
}
