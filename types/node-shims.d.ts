declare const process: {
  cwd(): string;
};

declare module "node:fs/promises" {
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
}

declare module "node:path" {
  const path: {
    join(...parts: string[]): string;
  };

  export default path;
}
