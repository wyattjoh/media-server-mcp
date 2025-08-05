import { assertEquals } from "jsr:@std/assert";
import {
  applyRadarrMovieFilters,
  applySonarrSeriesFilters,
} from "../../src/utils/filters.ts";
import type { RadarrMovie } from "../../src/types/radarr.ts";
import type { SonarrSeries } from "../../src/types/sonarr.ts";

Deno.test("applyRadarrMovieFilters - filter by imdbId", () => {
  const movies: RadarrMovie[] = [
    {
      id: 1,
      title: "Movie 1",
      year: 2020,
      hasFile: true,
      status: "released",
      path: "/movies/movie1",
      qualityProfileId: 1,
      monitored: true,
      minimumAvailability: "released",
      isAvailable: true,
      runtime: 120,
      tmdbId: 123,
      imdbId: "tt1234567",
    },
    {
      id: 2,
      title: "Movie 2",
      year: 2021,
      hasFile: false,
      status: "released",
      path: "/movies/movie2",
      qualityProfileId: 1,
      monitored: true,
      minimumAvailability: "released",
      isAvailable: true,
      runtime: 130,
      tmdbId: 456,
      imdbId: "tt7654321",
    },
  ];

  const filtered = applyRadarrMovieFilters(movies, {
    imdbId: "tt1234567",
  });

  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].title, "Movie 1");
});

Deno.test("applyRadarrMovieFilters - filter by tmdbId", () => {
  const movies: RadarrMovie[] = [
    {
      id: 1,
      title: "Movie 1",
      year: 2020,
      hasFile: true,
      status: "released",
      path: "/movies/movie1",
      qualityProfileId: 1,
      monitored: true,
      minimumAvailability: "released",
      isAvailable: true,
      runtime: 120,
      tmdbId: 123,
      imdbId: "tt1234567",
    },
    {
      id: 2,
      title: "Movie 2",
      year: 2021,
      hasFile: false,
      status: "released",
      path: "/movies/movie2",
      qualityProfileId: 1,
      monitored: true,
      minimumAvailability: "released",
      isAvailable: true,
      runtime: 130,
      tmdbId: 456,
      imdbId: "tt7654321",
    },
  ];

  const filtered = applyRadarrMovieFilters(movies, {
    tmdbId: 456,
  });

  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].title, "Movie 2");
});

Deno.test("applySonarrSeriesFilters - filter by imdbId", () => {
  const series: SonarrSeries[] = [
    {
      id: 1,
      title: "Series 1",
      year: 2020,
      status: "continuing",
      ended: false,
      path: "/series/series1",
      qualityProfileId: 1,
      seasonFolder: true,
      monitored: true,
      useSceneNumbering: false,
      runtime: 45,
      tvdbId: 123,
      imdbId: "tt1111111",
      tmdbId: 789,
      seriesType: "standard",
    },
    {
      id: 2,
      title: "Series 2",
      year: 2021,
      status: "ended",
      ended: true,
      path: "/series/series2",
      qualityProfileId: 1,
      seasonFolder: true,
      monitored: true,
      useSceneNumbering: false,
      runtime: 60,
      tvdbId: 456,
      imdbId: "tt2222222",
      tmdbId: 1011,
      seriesType: "standard",
    },
  ];

  const filtered = applySonarrSeriesFilters(series, {
    imdbId: "tt2222222",
  });

  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].title, "Series 2");
});

Deno.test("applySonarrSeriesFilters - filter by tmdbId", () => {
  const series: SonarrSeries[] = [
    {
      id: 1,
      title: "Series 1",
      year: 2020,
      status: "continuing",
      ended: false,
      path: "/series/series1",
      qualityProfileId: 1,
      seasonFolder: true,
      monitored: true,
      useSceneNumbering: false,
      runtime: 45,
      tvdbId: 123,
      imdbId: "tt1111111",
      tmdbId: 789,
      seriesType: "standard",
    },
    {
      id: 2,
      title: "Series 2",
      year: 2021,
      status: "ended",
      ended: true,
      path: "/series/series2",
      qualityProfileId: 1,
      seasonFolder: true,
      monitored: true,
      useSceneNumbering: false,
      runtime: 60,
      tvdbId: 456,
      imdbId: "tt2222222",
      tmdbId: 1011,
      seriesType: "standard",
    },
  ];

  const filtered = applySonarrSeriesFilters(series, {
    tmdbId: 789,
  });

  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].title, "Series 1");
});
