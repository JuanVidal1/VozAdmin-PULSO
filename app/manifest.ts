import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VozAdmin",
    short_name: "VozAdmin",
    description: "Inteligencia operativa para tu negocio",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f3",
    theme_color: "#101b19",
    lang: "es-CO"
  };
}