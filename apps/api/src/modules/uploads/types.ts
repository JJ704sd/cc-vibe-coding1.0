export type UploadFileRow = {
  id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  sha256_hash: string;
  created_at: string;
};
