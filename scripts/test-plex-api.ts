import {
  createPlexConfig,
  getAccounts,
  getLibraries,
  getLibraryItems,
  getMetadata,
  getPlaybackHistory,
  search,
  SearchType,
  testConnection,
} from "../packages/plex/mod.ts";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}. Resolve it with varlock before running.`);
  }
  return value;
}

function printJson(label: string, value: unknown): void {
  console.log(`${label}\n${JSON.stringify(value, null, 2)}`);
}

async function main(): Promise<void> {
  const config = createPlexConfig(
    requiredEnv("PLEX_URL"),
    requiredEnv("PLEX_API_KEY"),
  );
  const requestedRatingKeys = Deno.args;

  printJson("GET /", await testConnection(config));

  const accounts = await getAccounts(config);
  printJson("GET /accounts", accounts.MediaContainer.Account ?? []);

  const libraries = await getLibraries(config);
  const libraryDirectories = libraries.MediaContainer.Directory;
  printJson(
    "GET /library/sections",
    libraryDirectories.map(({ key, title, type }) => ({
      key,
      title,
      type,
    })),
  );

  const discoveredItems: Array<{
    ratingKey: string;
    title: string;
    type: string;
    libraryKey: string;
  }> = [];
  for (const library of libraryDirectories) {
    const libraryItems = await getLibraryItems(config, library.key, {
      size: 1,
    });
    const firstItem = libraryItems.MediaContainer.Metadata?.[0];
    if (firstItem) {
      discoveredItems.push({
        ratingKey: firstItem.ratingKey,
        title: firstItem.title,
        type: firstItem.type,
        libraryKey: library.key,
      });
    }

    if (library.type === "show") {
      const episodeItems = await getLibraryItems(config, library.key, {
        type: 4,
        size: 1,
      });
      const firstEpisode = episodeItems.MediaContainer.Metadata?.[0];
      if (firstEpisode) {
        discoveredItems.push({
          ratingKey: firstEpisode.ratingKey,
          title: firstEpisode.title,
          type: firstEpisode.type,
          libraryKey: library.key,
        });
      }
    }
  }
  printJson("GET /library/sections/{key}/all", discoveredItems);

  const searchResult = await search(
    config,
    "*",
    10,
    [SearchType.Movies, SearchType.TV],
  );
  const searchItems = searchResult.MediaContainer.Hub.flatMap((hub) =>
    hub.Metadata ?? []
  );
  printJson(
    "GET /hubs/search?query=*&searchTypes=movies,tv",
    searchItems.slice(0, 10).map(({ ratingKey, title, type, year }) => ({
      ratingKey,
      title,
      type,
      year,
    })),
  );

  const candidateItems = [
    ...searchItems.map(({ ratingKey, title, type }) => ({
      ratingKey,
      title,
      type,
    })),
    ...discoveredItems,
  ];
  const preferredTypes = ["movie", "show", "episode"];
  const fallbackRatingKeys = preferredTypes.flatMap((type) => {
    const item = candidateItems.find((candidate) => candidate.type === type);
    return item ? [item.ratingKey] : [];
  });
  const ratingKeys = requestedRatingKeys.length > 0 ? requestedRatingKeys : [
    ...new Set(
      fallbackRatingKeys.length > 0
        ? fallbackRatingKeys
        : candidateItems.map((item) => item.ratingKey),
    ),
  ];

  if (ratingKeys.length === 0) {
    console.log(
      "No media found. Pass one or more Plex rating keys to test metadata/history.",
    );
    return;
  }

  for (const ratingKey of ratingKeys) {
    const metadata = await getMetadata(config, ratingKey);
    const item = metadata.MediaContainer.Metadata[0];
    if (!item) {
      throw new Error(`No metadata returned for rating key ${ratingKey}`);
    }

    printJson(`GET /library/metadata/${ratingKey}`, {
      ratingKey: item.ratingKey,
      title: item.title,
      type: item.type,
      year: item.year,
      librarySectionID: item.librarySectionID,
      librarySectionTitle: item.librarySectionTitle,
    });

    const history = await getPlaybackHistory(config, ratingKey, { size: 25 });
    printJson(
      `GET /status/sessions/history/all?metadataItemID=${ratingKey}`,
      {
        size: history.MediaContainer.size,
        totalSize: history.MediaContainer.totalSize,
        offset: history.MediaContainer.offset,
        Metadata: (history.MediaContainer.Metadata ?? []).map((entry) => ({
          historyKey: entry.historyKey,
          ratingKey: entry.ratingKey,
          title: entry.title,
          type: entry.type,
          viewedAt: entry.viewedAt,
          accountID: entry.accountID,
          deviceID: entry.deviceID,
          parentRatingKey: entry.parentRatingKey,
          grandparentRatingKey: entry.grandparentRatingKey,
        })),
      },
    );
  }
}

if (import.meta.main) {
  await main();
}
