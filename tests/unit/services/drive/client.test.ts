import { extractFolderId } from "@/services/drive/client";

describe("extractFolderId", () => {
  test("extracts ID from folder links", () => {
    expect(extractFolderId("https://drive.google.com/drive/folders/abc123_-XYZ")).toBe(
      "abc123_-XYZ",
    );
    expect(
      extractFolderId("https://drive.google.com/drive/u/0/folders/abc123_-XYZ?usp=sharing"),
    ).toBe("abc123_-XYZ");
  });

  test("extracts ID from open?id= links", () => {
    expect(extractFolderId("https://drive.google.com/open?id=abc123_-XYZ")).toBe("abc123_-XYZ");
  });

  test("accepts a raw folder ID", () => {
    expect(extractFolderId("pasta-adm-456")).toBe("pasta-adm-456");
  });

  test("rejects file links", () => {
    expect(extractFolderId("https://drive.google.com/file/d/abc123_-XYZ/view")).toBeNull();
  });

  test("rejects unrelated URLs and empty input", () => {
    expect(extractFolderId("https://example.com/arquivo")).toBeNull();
    expect(extractFolderId("")).toBeNull();
  });
});
