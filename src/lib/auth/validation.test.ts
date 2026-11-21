import { describe, expect, it } from "vitest";
import {
  hasErrors,
  normalizeEmail,
  normalizeName,
  validateEmail,
  validateLogin,
  validateName,
  validateNewPassword,
  validateRegistration,
} from "./validation";

const valid = {
  name: "Aicha Mint Ahmed",
  email: "aicha@example.com",
  password: "correct horse 42",
  confirmPassword: "correct horse 42",
};

describe("validateRegistration", () => {
  it("accepts a complete valid form", () => {
    const errors = validateRegistration(valid);
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  it("requires every field", () => {
    const errors = validateRegistration({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    expect(errors).toEqual({
      name: "required",
      email: "required",
      password: "required",
      confirmPassword: "required",
    });
  });

  it("rejects a confirmation that does not match", () => {
    expect(
      validateRegistration({ ...valid, confirmPassword: "different 42" }),
    ).toEqual({ confirmPassword: "mismatch" });
  });

  it("accepts Arabic names", () => {
    expect(validateName("عائشة بنت أحمد")).toBeNull();
  });
});

describe("validateName", () => {
  it("ignores extra spaces when measuring", () => {
    expect(validateName("   A   ")).toBe("tooShort");
    expect(normalizeName("  Ali   Ben ")).toBe("Ali Ben");
  });

  it("rejects names that are too long", () => {
    expect(validateName("a".repeat(81))).toBe("tooLong");
    expect(validateName("a".repeat(80))).toBeNull();
  });
});

describe("validateEmail", () => {
  it("accepts normal addresses and trims them", () => {
    expect(validateEmail("  User@Example.com ")).toBeNull();
    expect(normalizeEmail("  User@Example.com ")).toBe("user@example.com");
  });

  it("rejects malformed addresses", () => {
    expect(validateEmail("")).toBe("required");
    expect(validateEmail("no-at-sign")).toBe("invalid");
    expect(validateEmail("a@b")).toBe("invalid");
    expect(validateEmail("a b@c.com")).toBe("invalid");
  });
});

describe("validateNewPassword", () => {
  it("requires at least 8 characters", () => {
    expect(validateNewPassword("1234567")).toBe("tooShort");
    expect(validateNewPassword("12345678")).toBeNull();
  });

  it("rejects absurdly long passwords", () => {
    expect(validateNewPassword("a".repeat(129))).toBe("tooLong");
  });

  it("does not trim spaces", () => {
    expect(validateNewPassword("       ")).toBe("tooShort");
    expect(validateNewPassword("        ")).toBeNull();
  });
});

describe("validateLogin", () => {
  it("accepts filled fields without judging the password", () => {
    expect(validateLogin({ email: "a@b.co", password: "x" })).toEqual({});
  });

  it("requires email and password", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "required",
      password: "required",
    });
  });
});
