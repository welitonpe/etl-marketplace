import { z } from "zod";
export const ENV = import.meta.env;

export const schema = z
    .object({
        OAUTH_CLIENT_ID: z.string(),
        OAUTH_CLIENT_SECRET: z.string(),
        OAUTH_HOST: z.string(),
    })
    .parse(ENV);
