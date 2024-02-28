import path from "path";

export { path };

export const paths = {
    data: path.join(import.meta.dir, "..", "..", "etl", "data"),
    download: path.join(import.meta.dir, "..", "..", "etl", "downloads"),
    developer: path.join(
        import.meta.dir,
        "..",
        "..",
        "etl",
        "downloads",
        "developer"
    ),
    metadata: path.join(import.meta.dir, "..", "..", "etl", "metadata"),
    sql: path.join(import.meta.dir, "..", "..", "etl", "sql"),
};
