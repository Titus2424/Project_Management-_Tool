import { getClient } from '../../../app-gen-sdk/data';
import type { Queue } from '../models/queue-model';
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const DATA_SOURCE_NAME = 'Queue';

export class QueueService {
  static async create(record: Omit<Queue, 'id'>): Promise<Queue> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as Queue;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<Queue, 'id'>>
  ): Promise<Queue> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as Queue;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<Queue> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as Queue;
  }

  static async getAll(options?: IOperationOptions): Promise<Queue[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as Queue[];
  }
}