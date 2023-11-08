import JSON5 from 'json5';
import path from 'path';
import fs from 'fs';
import { FileSystem, Async } from '@rushstack/node-core-library';
import { PackageExtractor } from '@rushstack/package-extractor';

export async function pnpmSync(): Promise<void> {
  //we assume .pnpm-sync.json is always under node_modules folder
  const pnpmSyncJsonPath = 'node_modules/.pnpm-sync.json';

  if (!FileSystem.exists(pnpmSyncJsonPath)) {
    //TO DO, what shall we do if .pnpm-sync.json is not exist
    return;
  }

  //read the .pnpm-sync.json
  const pnpmSyncJson = JSON5.parse(FileSystem.readFile(pnpmSyncJsonPath).toString());
  const { sourceFolder, targetFolders } = pnpmSyncJson.postbuildInjectedCopy;
  const sourcePath = path.resolve(pnpmSyncJsonPath, sourceFolder);

  //get npmPackFiles
  const npmPackFiles: string[] = await PackageExtractor.getPackageIncludedFilesAsync(sourcePath);

  //clear the destination folder first
  for (const targetFolder of targetFolders) {
    const destinationPath = path.resolve(pnpmSyncJsonPath, targetFolder.folderPath);
    await FileSystem.deleteFolderAsync(destinationPath);
  };

  await Async.forEachAsync(
    npmPackFiles,
    async (npmPackFile: string) => {
      for (const targetFolder of targetFolders) {
        const destinationPath = path.resolve(pnpmSyncJsonPath, targetFolder.folderPath);

        const copySourcePath: string = path.join(sourcePath, npmPackFile);
        const copyDestinationPath: string = path.join(destinationPath, npmPackFile);

        await FileSystem.ensureFolderAsync(path.dirname(copyDestinationPath));

        // create a hard link to the destination path
        await fs.promises.link(copySourcePath, copyDestinationPath);
      }
    },
    {
      concurrency: 10
    }
  );
}