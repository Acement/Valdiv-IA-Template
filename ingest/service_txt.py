def parse_service_txt(text: str) -> dict:
    metadata = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip().lower()
        value = value.strip()

        if key == "tipo":
            metadata["tipos"] = [v.strip() for v in value.split(",")]
        elif key == "rating":
            try:
                metadata["rating"] = float(value)
            except ValueError:
                pass
        else:
            metadata[key] = value

    return metadata
