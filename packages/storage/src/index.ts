import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

export interface StoredFile {
  body: Uint8Array;
  contentType?: string;
}

export interface FileStorage {
  put(key: string, file: StoredFile): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
  close?(): Promise<void>;
}

function validateKey(key: string): string {
  if (!key || key.includes("\\") || key.includes("\0") || path.posix.isAbsolute(key)) {
    throw new Error("Storage key must be a non-empty relative POSIX path.");
  }
  const segments = key.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Storage key contains an invalid path segment.");
  }
  if (segments[0] === ".storage-metadata") {
    throw new Error("Storage key uses a reserved path.");
  }
  return key;
}

export function createFilesystemStorage(rootDirectory: string): FileStorage {
  const root = path.resolve(rootDirectory);
  const resolveKey = (key: string) => path.join(root, ...validateKey(key).split("/"));
  const resolveMetadataKey = (key: string) =>
    path.join(
      root,
      ".storage-metadata",
      `${createHash("sha256").update(validateKey(key)).digest("hex")}.content-type`,
    );
  return {
    async close() {},
    async put(key, file) {
      const target = resolveKey(key);
      const metadata = resolveMetadataKey(key);
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.${crypto.randomUUID()}.tmp`;
      try {
        await writeFile(temporary, file.body, { flag: "wx", mode: 0o600 });
        await rename(temporary, target);
        if (file.contentType) {
          await mkdir(path.dirname(metadata), { recursive: true });
          await writeFile(metadata, file.contentType, { mode: 0o600 });
        } else await rm(metadata, { force: true });
      } finally {
        await rm(temporary, { force: true });
      }
    },
    async get(key) {
      const target = resolveKey(key);
      const metadata = resolveMetadataKey(key);
      try {
        const body = await readFile(target);
        let contentType: string | undefined;
        try {
          contentType = await readFile(metadata, "utf8");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        return { body, ...(contentType ? { contentType } : {}) };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(key) {
      const target = resolveKey(key);
      const metadata = resolveMetadataKey(key);
      await rm(target, { force: true });
      await rm(metadata, { force: true });
    },
  };
}

export interface S3StorageOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function createS3Storage(options: S3StorageOptions): FileStorage {
  const client = new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    forcePathStyle: true,
    credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
  });
  return {
    async put(key, file) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: validateKey(key),
          Body: file.body,
          ContentType: file.contentType,
        }),
      );
    },
    async get(key) {
      try {
        const result = await client.send(
          new GetObjectCommand({ Bucket: options.bucket, Key: validateKey(key) }),
        );
        if (!result.Body) return null;
        return {
          body: await result.Body.transformToByteArray(),
          ...(result.ContentType ? { contentType: result.ContentType } : {}),
        };
      } catch (error) {
        if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)
          return null;
        throw error;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: options.bucket, Key: validateKey(key) }));
    },
    async close() {
      client.destroy();
    },
  };
}

export function createConfiguredStorage(env = process.env): FileStorage {
  if (env.STORAGE_DRIVER === "s3") {
    const required = [
      "S3_ENDPOINT",
      "S3_REGION",
      "S3_BUCKET",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
    ] as const;
    const values = Object.fromEntries(required.map((key) => [key, env[key]])) as Record<
      (typeof required)[number],
      string | undefined
    >;
    for (const key of required)
      if (!values[key]) throw new Error(`${key} is required when STORAGE_DRIVER=s3.`);
    return createS3Storage({
      endpoint: values.S3_ENDPOINT!,
      region: values.S3_REGION!,
      bucket: values.S3_BUCKET!,
      accessKeyId: values.S3_ACCESS_KEY_ID!,
      secretAccessKey: values.S3_SECRET_ACCESS_KEY!,
    });
  }
  if (env.STORAGE_DRIVER && env.STORAGE_DRIVER !== "filesystem")
    throw new Error("STORAGE_DRIVER must be filesystem or s3.");
  return createFilesystemStorage(env.FILE_STORAGE_DIRECTORY ?? "./.data/files");
}
