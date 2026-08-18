import { getClient } from '../../../app-gen-sdk/data';
import type { MobileOfflineProfile } from '../models/mobile-offline-profile-model';
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const DATA_SOURCE_NAME = 'MobileOfflineProfile';

export class MobileOfflineProfileService {
  static async create(record: Omit<MobileOfflineProfile, 'id'>): Promise<MobileOfflineProfile> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as MobileOfflineProfile;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<MobileOfflineProfile, 'id'>>
  ): Promise<MobileOfflineProfile> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as MobileOfflineProfile;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<MobileOfflineProfile> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as MobileOfflineProfile;
  }

  static async getAll(options?: IOperationOptions): Promise<MobileOfflineProfile[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as MobileOfflineProfile[];
  }
}