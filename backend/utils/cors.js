const fallbackOrigins = [
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
];

const getConfiguredOrigins = () =>
    [
        process.env.CLIENT_URL,
        process.env.FRONTEND_URL,
        process.env.APP_URL,
    ]
        .filter(Boolean)
        .flatMap((value) => value.split(','))
        .map((origin) => origin.trim())
        .filter(Boolean);

export const allowedOrigins = Array.from(
    new Set([
        ...fallbackOrigins,
        ...getConfiguredOrigins(),
    ]),
);

const isAllowedOrigin = (origin) =>
    !origin ||
    allowedOrigins.includes('*') ||
    allowedOrigins.includes(origin);

export const corsOptions = {
    credentials: true,
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Origin not allowed by CORS'));
    },
};
