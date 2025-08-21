import { describe, it, expect } from "vitest"
import { PermissionTree, explainPermission } from "../src"

describe("Basic Permission Tree Operations", () => {
  const tree = new PermissionTree([
    "users::123::posts::*;;read",
    "users::123::posts::456;;write",
    "!users::123::posts::456;;read",
    "*::*::*::*;;admin",
    "!projects::secret;;admin"
  ])

  it("allows read access with wildcard matching", () => {
    expect(tree.isAllowed("users::123::posts::789", "read")).toBe(true)
  })

  it("denies read access when explicitly excluded", () => {
    expect(tree.isAllowed("users::123::posts::456", "read")).toBe(false)
  })

  it("allows specific write permission", () => {
    expect(tree.isAllowed("users::123::posts::456", "write")).toBe(true)
  })

  it("allows admin access with global wildcard", () => {
    expect(tree.isAllowed("x::y::z::q", "admin")).toBe(true)
  })

  it("denies admin access on excluded resources", () => {
    expect(tree.isAllowed("projects::secret", "admin")).toBe(false)
  })

})

describe("Wildcard Action Permissions", () => {
  const tree = new PermissionTree([
    "users::123::posts::*;;*",
    "!users::123::posts::456;;*",
  ])

  it("allows read access with wildcard action", () => {
    expect(tree.isAllowed("users::123::posts::789", "read")).toBe(true)
  })

  it("allows write access with wildcard action", () => {
    expect(tree.isAllowed("users::123::posts::789", "write")).toBe(true)
  })

  it("denies read access when all actions are excluded", () => {
    expect(tree.isAllowed("users::123::posts::456", "read")).toBe(false)
  })

  it("denies write access when all actions are excluded", () => {
    expect(tree.isAllowed("users::123::posts::456", "write")).toBe(false)
  })

})

describe("Triple Wildcard (***) Pattern Matching", () => {
  const tree = new PermissionTree([
    "users::123::***;;read",
    "projects::***;;write",
    "!sensitive::***;;read",
  ])

  it("allows access to any nested subresource with *** pattern", () => {
    expect(tree.isAllowed("users::123::posts", "read")).toBe(true)
    expect(tree.isAllowed("users::123::posts::456", "read")).toBe(true)
    expect(tree.isAllowed("users::123::posts::456::comments", "read")).toBe(true)
  })

  it("allows write access to deeply nested project resources", () => {
    expect(tree.isAllowed("projects::foo", "write")).toBe(true)
    expect(tree.isAllowed("projects::foo::bar::baz", "write")).toBe(true)
  })

  it("denies access when *** pattern is explicitly excluded", () => {
    expect(tree.isAllowed("sensitive::data", "read")).toBe(false)
    expect(tree.isAllowed("sensitive::data::nested", "read")).toBe(false)
  })

  it("does not match resources shorter than *** wildcard position", () => {
    expect(tree.isAllowed("users::123", "read")).toBe(false)
    expect(tree.isAllowed("users", "read")).toBe(false)
  })
})

describe("Multiple Single Wildcard Pattern Matching", () => {
  const tree = new PermissionTree([
    "users::123::*::*;;*",
    "!users::123::posts::456;;*",
  ])

  it("allows access with multiple single wildcards", () => {
    expect(tree.isAllowed("users::123::posts::789", "read")).toBe(true)
    expect(tree.isAllowed("users::123::posts::789", "write")).toBe(true)
  })

  it("denies access when specific resource is excluded", () => {
    expect(tree.isAllowed("users::123::posts::456", "read")).toBe(false)
  })

  it("denies all actions when resource is excluded with wildcard action", () => {
    expect(tree.isAllowed("users::123::posts::456", "write")).toBe(false)
  })

})

describe("Permission Explanations", () => {
  const tree = new PermissionTree([
    "users::123::posts::*;;read",
    "users::123::posts::456;;write",
    "!users::123::posts::456;;read",
    "*::*::*::*;;admin",
    "!projects::secret;;admin",
    "users::123::***;;manage"
  ])

  it("explains allowed access with specific rule", () => {
    const explanation = tree.explain("users::123::posts::456", "write")
    
    expect(explanation.allowed).toBe(true)
    expect(explanation.reason).toContain("Access allowed by rule(s): users::123::posts::456;;write")
    expect(explanation.matchedAllowRules).toContain("users::123::posts::456;;write")
    expect(explanation.matchedDenyRules).toHaveLength(0)
    expect(explanation.path).toEqual(["users", "123", "posts", "456"])
    expect(explanation.action).toBe("write")
  })

  it("explains allowed access with wildcard rule", () => {
    const explanation = tree.explain("users::123::posts::789", "read")
    
    expect(explanation.allowed).toBe(true)
    expect(explanation.reason).toContain("Access allowed by rule(s): users::123::posts::*;;read")
    expect(explanation.matchedAllowRules).toContain("users::123::posts::*;;read")
  })

  it("explains denied access due to exclusion rule", () => {
    const explanation = tree.explain("users::123::posts::456", "read")
    
    expect(explanation.allowed).toBe(false)
    expect(explanation.reason).toContain("Access denied by exclusion rule(s): !users::123::posts::456;;read")
    expect(explanation.reason).toContain("deny rules take precedence")
    expect(explanation.matchedAllowRules).toContain("users::123::posts::*;;read")
    expect(explanation.matchedDenyRules).toContain("!users::123::posts::456;;read")
  })

  it("explains denied access with no matching rules", () => {
    const explanation = tree.explain("nonexistent::resource", "read")
    
    expect(explanation.allowed).toBe(false)
    expect(explanation.reason).toContain("Access denied: no matching allow rules found")
    expect(explanation.matchedAllowRules).toHaveLength(0)
    expect(explanation.matchedDenyRules).toHaveLength(0)
  })

  it("explains access with *** wildcard", () => {
    const explanation = tree.explain("users::123::posts::456::comments", "manage")
    
    expect(explanation.allowed).toBe(true)
    expect(explanation.reason).toContain("Access allowed by rule(s): users::123::***;;manage")
    expect(explanation.matchedAllowRules).toContain("users::123::***;;manage")
  })

  it("explains admin access with global wildcard", () => {
    const explanation = tree.explain("any::random::deep::resource", "admin")
    
    expect(explanation.allowed).toBe(true)
    expect(explanation.reason).toContain("Access allowed by rule(s): *::*::*::*;;admin")
    expect(explanation.matchedAllowRules).toContain("*::*::*::*;;admin")
  })

  it("explains denied admin access on excluded resource", () => {
    const explanation = tree.explain("projects::secret", "admin")
    
    expect(explanation.allowed).toBe(false)
    expect(explanation.reason).toContain("Access denied by exclusion rule(s): !projects::secret;;admin")
    expect(explanation.matchedDenyRules).toContain("!projects::secret;;admin")
  })
})

describe("explainPermission helper function", () => {
  const tree = new PermissionTree(["users::*;;read", "!users::blocked;;*"])

  it("works as a standalone helper function", () => {
    const explanation = explainPermission(tree, "users::123", "read")
    
    expect(explanation.allowed).toBe(true)
    expect(explanation.reason).toContain("Access allowed by rule(s): users::*;;read")
  })

  it("explains denied access via helper function", () => {
    const explanation = explainPermission(tree, "users::blocked", "read")
    
    expect(explanation.allowed).toBe(false)
    expect(explanation.reason).toContain("Access denied by exclusion rule(s): !users::blocked;;*")
  })
})
