import { readFileSync, readdirSync } from "node:fs"
import { extname, join, relative, resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readWorkspaceFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

function sourceFiles(path: string): string[] {
  const root = resolve(process.cwd(), path)

  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && [".ts", ".tsx"].includes(extname(entry.name)))
    .map((entry) => {
      const parentPath = "parentPath" in entry ? entry.parentPath : entry.path
      return relative(process.cwd(), join(parentPath, entry.name))
    })
}

describe("UI accessibility contracts", () => {
  it("keeps auth placeholder text at a practical contrast level", () => {
    const authFiles = [
      "src/components/auth/auth-input.tsx",
      "src/components/auth/auth-form.tsx",
      "src/app/reset-password/page.tsx",
    ]
    const lowContrastClasses = authFiles.flatMap((path) =>
      Array.from(
        readWorkspaceFile(path).matchAll(/placeholder(?:-foreground|:text-foreground)\/(\d+)/g),
        (match) => ({ path, className: match[0], opacity: Number(match[1]) }),
      ).filter(({ opacity }) => opacity < 60),
    )

    expect(lowContrastClasses).toEqual([])
  })

  it("gives the shared dialog close button a 44px touch target", () => {
    const dialog = readWorkspaceFile("src/components/ui/dialog.tsx")
    const closeButtonClasses = dialog.match(
      /<DialogPrimitive\.Close[^>]*className="([^"]+)"/s,
    )?.[1]

    expect(closeButtonClasses?.split(/\s+/)).toEqual(
      expect.arrayContaining(["h-11", "w-11"]),
    )
    expect(dialog).toContain("px-12 sm:pl-0 sm:pr-12")
  })

  it("constrains phone country flags without broad dropdown overrides", () => {
    const globals = readWorkspaceFile("src/app/globals.css")

    expect(globals).toMatch(
      /\.phone-input-custom \.PhoneInputCountryIcon\s*\{[^}]*width:\s*1\.5rem[^}]*height:\s*1rem/s,
    )
    expect(globals).not.toContain('[class*="PhoneInput"][class*="Select"]')
  })

  it("keeps footer copy free of mojibake", () => {
    const footer = readWorkspaceFile("src/components/footer.tsx")

    expect(footer).not.toMatch(/Â©|â€¢|å°çº¢ä¹¦/)
  })

  it("offers an accessible progressive-disclosure control for FAQ topics", () => {
    const faq = readWorkspaceFile("src/components/legal/faq-content.tsx")

    expect(faq).toMatch(/aria-expanded=\{[^}]+\}/)
    expect(faq).toMatch(/Show (?:all|more) topics/)
    expect(faq).toContain("Show fewer topics")
  })

  it("avoids low-contrast purple endpoints on text gradients", () => {
    const unsafeGradient = "from-white via-rookie-pink to-rookie-purple"
    const affectedFiles = sourceFiles("src/app").filter((path) =>
      readWorkspaceFile(path).includes(unsafeGradient),
    )

    expect(affectedFiles).toEqual([])
  })
})
