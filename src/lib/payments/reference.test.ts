import { describe, expect, it } from "vitest";
import { cleanReference, referenceKey, validateReference } from "./reference";

describe("validateReference", () => {
  it("accepts typical references", () => {
    expect(validateReference("123456789")).toBeNull();
    expect(validateReference("TX-2026/11 0042")).toBeNull();
    expect(validateReference("  abcd  ")).toBeNull();
  });

  it("requires a value", () => {
    expect(validateReference("")).toBe("required");
    expect(validateReference("   ")).toBe("required");
  });

  it("rejects references that are too short or too long", () => {
    expect(validateReference("123")).toBe("invalid");
    expect(validateReference("1".repeat(41))).toBe("invalid");
    expect(validateReference("1".repeat(40))).toBeNull();
  });

  it("rejects odd characters, including Arabic-Indic digits", () => {
    expect(validateReference("12<script>34")).toBe("invalid");
    expect(validateReference("١٢٣٤٥٦")).toBe("invalid");
    expect(validateReference("-1234")).toBe("invalid");
  });
});

describe("referenceKey", () => {
  it("treats differently written copies of one reference as the same", () => {
    expect(referenceKey("ab-12 34")).toBe("AB1234");
    expect(referenceKey("AB1234")).toBe("AB1234");
    expect(referenceKey("  ab / 1234 ")).toBe("AB1234");
  });

  it("keeps different references different", () => {
    expect(referenceKey("AB1234")).not.toBe(referenceKey("AB1235"));
  });

  it("cleans spaces for storage", () => {
    expect(cleanReference("  12   34  ")).toBe("12 34");
  });
});
