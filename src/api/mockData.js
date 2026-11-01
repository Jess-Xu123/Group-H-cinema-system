// src/api/mockData.js

export const nowShowingMovies = [
  {
    id: "m1",
    title: "Dune: Part Two",
    genre: "SCI-FI / ADVENTURE",
    ageRestriction: 12,
    isPremiere: false,
    poster:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800",
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
    poster:
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800",
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
    poster:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800",
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
    poster:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800",
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
    poster:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800",
    releaseDate: "Coming soon",
  },
  {
    id: "u2",
    title: "The Architect",
    genre: "DRAMA / HISTORY",
    poster:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800",
    releaseDate: "Coming soon",
  },
  {
    id: "u3",
    title: "Lumina",
    genre: "ANIMATION / FANTASY",
    poster:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800",
    releaseDate: "Coming soon",
  },
  {
    id: "u4",
    title: "The Shadow",
    genre: "THRILLER / DRAMA",
    poster:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800",
    releaseDate: "Coming soon",
  },
];
