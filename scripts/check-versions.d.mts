export interface ResolvedVersions {
  next: string;
  react: string;
  reactDom: string;
}

export declare function checkVersions(versions: ResolvedVersions): void;
export declare function getResolvedVersions(): ResolvedVersions;
