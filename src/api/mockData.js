// src/api/mockData.js

export const nowShowingMovies = [
  {
    id: "m1",
    title: "Dune: Part Two",
    genre: "SCI-FI / ADVENTURE",
    ageRestriction: 12,
    isPremiere: false,
    poster: "https://a3s.fi/swift/v1/Rio-media/movie poster/dune.jpg",
    showtime: "18:00",
    room: "Room 1",
    price: 15.0,
  },
  {
    id: "m2",
    title: "Oppenheimer",
    genre: "DRAMA / HISTORY",
    ageRestriction: 16,
    isPremiere: false,
    poster: "https://a3s.fi/swift/v1/Rio-media/movie poster/oppenheimer.jpg",
    showtime: "20:15",
    room: "Room 2",
    price: 15.0,
  },
  {
    id: "m3",
    title: "Inside Out 2",
    genre: "ANIMATION / FAMILY",
    ageRestriction: 0,
    isPremiere: false,
    poster: "https://a3s.fi/swift/v1/Rio-media/movie poster/insideout.png",
    showtime: "15:30",
    room: "Room 1",
    price: 12.0,
    discountNote: "(Child -50%)",
  },
  {
    id: "m4",
    title: "Joker 2",
    genre: "THRILLER / DRAMA",
    ageRestriction: 16,
    isPremiere: true, // Applies +15% premiere rule
    poster: "https://a3s.fi/swift/v1/Rio-media/movie poster/Joker2.jpg",
    showtime: "21:00",
    room: "Room 2",
    price: 17.25,
  },
];

export const upcomingMovies = [
  {
    id: "u1",
    title: "Dune: Part Three",
    genre: "SCI-FI / ADVENTURE",
    poster: "https://a3s.fi/swift/v1/Rio-media/movie poster/dune3.jpg",
    releaseDate: "Coming soon",
  },
  {
    id: "u2",
    title: "The Lord of the Rings: The Hunt for Gollum",
    genre: "DRAMA / FICTION",
    poster:
      "https://a3s.fi/swift/v1/Rio-media/movie poster/The Lord of the Rings_ The Hunt for Gollum.jpg",
    releaseDate: "Coming soon",
  },
  {
    id: "u3",
    title: "The Thomas Crown Affair",
    genre: "THRILLER / ACTION",
    poster:
      "https://a3s.fi/swift/v1/Rio-media/movie poster/The Thomas Crown Affair.jpg",
    releaseDate: "Coming soon",
  },
  {
    id: "u4",
    title: "Ice Age: Boiling Point",
    genre: "ANIMATION / ADVENTURE",
    poster:
      "https://a3s.fi/swift/v1/Rio-media/movie poster/Ice Age_ Boiling Point.jpg",
    releaseDate: "Coming soon",
  },
];
