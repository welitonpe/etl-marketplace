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
    csv: path.join(import.meta.dir, "..", "..", "etl", "csv"),
    json: path.join(import.meta.dir, "..", "..", "etl", "json"),
    metadata: path.join(import.meta.dir, "..", "..", "etl", "metadata"),
    sql: path.join(import.meta.dir, "..", "..", "etl", "sql"),
    test: path.join(import.meta.dir, "..", "..", "etl", "TEST"),
};
