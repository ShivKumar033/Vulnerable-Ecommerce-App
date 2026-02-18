// /// <reference types="node" />
// import "dotenv/config";
// import { defineConfig } from "prisma/config";

// // Ensure DATABASE_URL is loaded
// const databaseUrl = process.env.DATABASE_URL;

// if (!databaseUrl) {
//   throw new Error("DATABASE_URL is not defined in .env file");
// }

// export default defineConfig({
//   schema: "prisma/schema.prisma",
//   migrations: {
//     path: "prisma/migrations",
//   },
//   datasource: {
//     url: databaseUrl,
//   },
// });


import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',

  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
