#!/usr/bin/env bun

import { PermissionTree, explainPermission } from "./src/index.js"

console.log("🔐 Permission System Demo\n")

// Create a permission tree with various rules
const tree = new PermissionTree([
  // Allow rules
  "users::123::posts::*;;read",           // Allow reading any post by user 123
  "users::123::posts::456;;write",        // Allow writing to specific post 456
  "users::123::***;;manage",              // Allow managing any subresource under user 123
  "projects::*;;read",                    // Allow reading any project
  "*::*::*::*;;admin",                    // Allow admin action on any 4-level resource
  
  // Deny rules (exclusions)
  "!users::123::posts::456;;read",        // Deny reading specific post 456
  "!projects::secret;;*",                 // Deny all actions on secret project
  "!sensitive::***;;*"                    // Deny all actions on any sensitive subresource
])

console.log("📋 Permission Rules:")
console.log("✅ Allow: users::123::posts::*;;read")
console.log("✅ Allow: users::123::posts::456;;write")
console.log("✅ Allow: users::123::***;;manage")
console.log("✅ Allow: projects::*;;read")
console.log("✅ Allow: *::*::*::*;;admin")
console.log("❌ Deny:  !users::123::posts::456;;read")
console.log("❌ Deny:  !projects::secret;;*")
console.log("❌ Deny:  !sensitive::***;;*")
console.log("\n" + "=".repeat(60) + "\n")

// Test cases with explanations
const testCases = [
  // Allowed cases
  { resource: "users::123::posts::789", action: "read", description: "Reading post 789 by user 123" },
  { resource: "users::123::posts::456", action: "write", description: "Writing to post 456" },
  { resource: "users::123::profile::settings", action: "manage", description: "Managing user profile settings (*** wildcard)" },
  { resource: "projects::webapp", action: "read", description: "Reading webapp project" },
  { resource: "api::v1::users::list", action: "admin", description: "Admin access to user list" },
  
  // Denied cases
  { resource: "users::123::posts::456", action: "read", description: "Reading post 456 (explicitly denied)" },
  { resource: "projects::secret", action: "read", description: "Reading secret project (denied)" },
  { resource: "sensitive::data::user::info", action: "read", description: "Accessing sensitive data (*** deny)" },
  { resource: "unauthorized::resource", action: "read", description: "No matching rules" },
  { resource: "users::456::posts::123", action: "read", description: "Different user's posts" }
]

testCases.forEach((testCase, index) => {
  console.log(`🧪 Test ${index + 1}: ${testCase.description}`)
  console.log(`   Resource: ${testCase.resource}`)
  console.log(`   Action:   ${testCase.action}`)
  
  // Get basic permission check
  const isAllowed = tree.isAllowed(testCase.resource, testCase.action)
  
  // Get detailed explanation
  const explanation = tree.explain(testCase.resource, testCase.action)
  
  // Display results
  console.log(`   Result:   ${isAllowed ? "✅ ALLOWED" : "❌ DENIED"}`)
  console.log(`   Reason:   ${explanation.reason}`)
  
  if (explanation.matchedAllowRules.length > 0) {
    console.log(`   Allow Rules: ${explanation.matchedAllowRules.join(", ")}`)
  }
  
  if (explanation.matchedDenyRules.length > 0) {
    console.log(`   Deny Rules:  ${explanation.matchedDenyRules.join(", ")}`)
  }
  
  console.log("")
})

console.log("=".repeat(60))
console.log("🔍 Using the standalone explainPermission helper function:")
console.log("")

// Demonstrate the helper function
const helperExample = explainPermission(tree, "users::123::posts::999", "read")
console.log(`Resource: users::123::posts::999`)
console.log(`Action: read`)
console.log(`Result: ${helperExample.allowed ? "✅ ALLOWED" : "❌ DENIED"}`)
console.log(`Explanation: ${helperExample.reason}`)

console.log("\n" + "=".repeat(60))
console.log("✨ Demo complete! Try modifying the rules or test cases above.")