import { assertEquals } from "jsr:@std/assert";
import { applyRadarrMovieFilters, type RadarrMovie } from "../mod.ts";

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
