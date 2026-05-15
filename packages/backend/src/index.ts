import { app } from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`Toll fee backend listening on port ${PORT}`);
});
