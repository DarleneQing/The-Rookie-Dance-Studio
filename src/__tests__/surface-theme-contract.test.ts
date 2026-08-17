import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readWorkspaceFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

function hslColor(css: string, token: string) {
  const declaration = css.match(
    new RegExp(`--${token}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`),
  )

  if (!declaration) {
    throw new Error(`Missing HSL theme token: --${token}`)
  }

  return {
    hue: Number(declaration[1]),
    saturation: Number(declaration[2]),
    lightness: Number(declaration[3]),
  }
}

describe("dark surface theme", () => {
  it("keeps shared card and popover surfaces near-black", () => {
    const css = readWorkspaceFile("src/app/globals.css")
    const invalidSurfaces = ["card", "popover"].filter((token) => {
      const { saturation, lightness } = hslColor(css, token)
      return saturation > 5 || lightness > 10
    })

    expect(invalidSurfaces).toEqual([])
  })

  it("keeps profile history surfaces free of opaque brand-purple fills", () => {
    const historyDialogs = [
      "src/components/profile/checkin-history-dialog.tsx",
      "src/components/profile/subscription-history-dialog.tsx",
    ]
    const dialogsWithPurpleSurfaces = historyDialogs.filter((path) =>
      /(?:^|\s)bg-rookie-purple(?:\/[\d.]+)?(?=\s|["'])/m.test(
        readWorkspaceFile(path),
      ),
    )

    expect(dialogsWithPurpleSurfaces).toEqual([])
  })
})
