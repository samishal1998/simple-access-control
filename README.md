# simple-access-control

A lightweight, AWS ARN-inspired access control library focused on **simplicity first**. Built with TypeScript, tested extensively, and designed for hierarchical permission systems.

[![npm version](https://badge.fury.io/js/@samyx%2Fsimple-access-control.svg)](https://badge.fury.io/js/@samyx%2Fsimple-access-control)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## 🎯 Philosophy

This library prioritizes **developer experience and simplicity** over raw performance. However, performance is still excellent - handling 1M+ permission checks per second even with 100K+ rules.

## ✨ Features

- **AWS ARN-inspired syntax**: `resource::subresource::id;;action`
- **Hierarchical wildcards**: Single (`*`) and triple (`***`) wildcard support
- **Exclusion rules**: Explicit denials with `!` prefix  
- **Tree-based matching**: Efficient permission resolution
- **Detailed explanations**: Understand why permissions are granted/denied
- **TypeScript first**: Full type safety and IntelliSense
- **Dual module support**: Both ESM and CommonJS
- **Zero dependencies**: Lightweight and secure

## 🚀 Installation

```bash
# npm
npm install simple-access-control

# yarn  
yarn add simple-access-control

# pnpm
pnpm add simple-access-control

# bun
bun add simple-access-control
```

## 📖 Quick Start

```typescript
import { PermissionTree } from "simple-access-control"

// Create a permission tree with various rules
const tree = new PermissionTree([
  // Allow reading any post by user 123
  "users::123::posts::*;;read",
  
  // Allow full access to user 123's profile  
  "users::123::profile::***;;*",
  
  // Deny reading specific post 456
  "!users::123::posts::456;;read",
  
  // Organization-wide admin access
  "acme-corp::***;;admin"
])

// Check permissions
tree.isAllowed("users::123::posts::789", "read")    // ✅ true
tree.isAllowed("users::123::posts::456", "read")    // ❌ false (denied)
tree.isAllowed("users::123::profile::settings", "edit") // ✅ true
tree.isAllowed("acme-corp::any::resource", "admin") // ✅ true
```

## 🏗️ Permission Format

Permissions follow the AWS ARN-inspired format:

```
resource::subresource::id;;action
```

### Examples
```typescript
// Specific resource and action
"users::123::posts::456;;read"

// Wildcard matching any single segment  
"users::123::posts::*;;read"        // matches posts/456, posts/789, etc.

// Triple wildcard matching any nested path
"users::123::***;;manage"           // matches posts/456, posts/456/comments, etc.

// Action wildcards
"users::123::posts::456;;*"         // allows any action

// Exclusion rules (denies take precedence)
"!users::123::posts::private;;*"    // deny all actions
```

## 🌟 Wildcard Patterns

### Single Wildcard (`*`)
Matches exactly one segment at that position:
```typescript
"users::*::posts;;read" // matches: users::123::posts, users::456::posts
```

### Triple Wildcard (`***`) 
Matches any remaining nested path:
```typescript
"users::123::***;;read" 
// ✅ matches: users::123::posts
// ✅ matches: users::123::posts::456  
// ✅ matches: users::123::profile::settings::theme
// ❌ doesn't match: users::123 (path too short)
```

## 🔍 Permission Explanations

Get detailed explanations for why permissions are granted or denied:

```typescript
const explanation = tree.explain("users::123::posts::456", "read")

console.log(explanation)
// {
//   allowed: false,
//   reason: "Access denied by exclusion rule(s): !users::123::posts::456;;read. Although allow rule(s) matched: users::123::posts::*;;read, deny rules take precedence.",
//   matchedAllowRules: ["users::123::posts::*;;read"],
//   matchedDenyRules: ["!users::123::posts::456;;read"],  
//   path: ["users", "123", "posts", "456"],
//   action: "read"
// }
```

## 🏢 Real-World Examples

### Enterprise Permission System
```typescript
// Enterprise permission system
const permissions = new PermissionTree([
  // Organization-wide permissions
  "acme-corp::***;;admin",
  "acme-corp::us-east::***;;regional-admin",
  
  // Department permissions  
  "acme-corp::us-east::engineering::***;;manage",
  "acme-corp::us-east::engineering::backend::***;;deploy",
  
  // Project-specific access
  "acme-corp::us-east::engineering::backend::api-service::production::*;;read",
  "acme-corp::us-east::engineering::backend::api-service::staging::*;;write",
  
  // Security restrictions
  "!acme-corp::us-east::engineering::backend::api-service::production::secrets;;*",
  "!acme-corp::us-east::engineering::backend::api-service::production::database;;delete"
])

// Usage
permissions.isAllowed("acme-corp::us-east::engineering::backend::api-service::staging::configs", "write") // ✅
permissions.isAllowed("acme-corp::us-east::engineering::backend::api-service::production::secrets", "read") // ❌
```

### Role-Based Access Control (RBAC) Implementation

RBAC can be easily implemented by storing permissions for each role and expanding them when constructing the tree:

```typescript
// Define roles with their permissions
const roles = {
  admin: [
    "organization::***;;*"
  ],
  
  manager: [
    "organization::department::***;;manage",
    "organization::department::reports::*;;read",
    "organization::department::budgets::*;;read"
  ],
  
  developer: [
    "organization::department::projects::*;;read",
    "organization::department::projects::*;;write", 
    "organization::department::repositories::*;;read",
    "!organization::department::projects::production;;write"
  ],
  
  viewer: [
    "organization::department::projects::*;;read",
    "organization::department::reports::*;;read"
  ]
}

// User with multiple roles
const userRoles = ['developer', 'viewer']

// Expand user permissions from roles
function getUserPermissions(userRoles: string[]): string[] {
  return userRoles.flatMap(role => roles[role] || [])
}

// Create permission tree for the user
const userPermissions = new PermissionTree(getUserPermissions(userRoles))

// Check permissions
userPermissions.isAllowed("organization::department::projects::my-app", "write") // ✅ true
userPermissions.isAllowed("organization::department::projects::production", "write") // ❌ false
userPermissions.isAllowed("organization::department::reports::monthly", "read") // ✅ true
```

### Dynamic Role Assignment

```typescript
// Function to build permissions for a user with dynamic roles
function buildUserPermissionTree(userId: string, assignedRoles: string[]): PermissionTree {
  // Get base permissions from roles
  const rolePermissions = assignedRoles.flatMap(role => roles[role] || [])
  
  // Add user-specific permissions
  const userSpecificPermissions = [
    `users::${userId}::profile::***;;*`,  // Full access to own profile
    `users::${userId}::settings::***;;*`  // Full access to own settings
  ]
  
  // Combine all permissions
  const allPermissions = [...rolePermissions, ...userSpecificPermissions]
  
  return new PermissionTree(allPermissions)
}

// Usage
const johnPermissions = buildUserPermissionTree("john123", ["developer", "manager"])
johnPermissions.isAllowed("users::john123::profile::avatar", "write") // ✅ true
johnPermissions.isAllowed("organization::department::budgets::q4", "read") // ✅ true (manager role)
```

### Role Inheritance

```typescript
// Hierarchical role system with inheritance
const roleHierarchy = {
  admin: {
    permissions: ["organization::***;;*"],
    inherits: []
  },
  
  manager: {
    permissions: [
      "organization::department::***;;manage",
      "organization::department::reports::*;;read"
    ],
    inherits: ["developer", "viewer"]
  },
  
  developer: {
    permissions: [
      "organization::department::projects::*;;read",
      "organization::department::projects::*;;write",
      "!organization::department::projects::production;;write"
    ],
    inherits: ["viewer"]
  },
  
  viewer: {
    permissions: [
      "organization::department::projects::*;;read"
    ],
    inherits: []
  }
}

function expandRolePermissions(roleName: string, visited = new Set()): string[] {
  if (visited.has(roleName)) return [] // Prevent circular references
  visited.add(roleName)
  
  const role = roleHierarchy[roleName]
  if (!role) return []
  
  // Get permissions from inherited roles
  const inheritedPermissions = role.inherits.flatMap(inheritedRole => 
    expandRolePermissions(inheritedRole, visited)
  )
  
  // Combine with direct permissions  
  return [...inheritedPermissions, ...role.permissions]
}

// Build permission tree with inheritance
const managerPermissions = new PermissionTree(expandRolePermissions("manager"))

// Manager inherits viewer + developer permissions plus their own
managerPermissions.isAllowed("organization::department::projects::app", "read")    // ✅ true (from viewer)
managerPermissions.isAllowed("organization::department::projects::app", "write")   // ✅ true (from developer)
managerPermissions.isAllowed("organization::department::reports::monthly", "read") // ✅ true (manager)
```

## ⚡ Performance

While optimized for simplicity, performance is still excellent:

| Rules | Construction | Avg Check Time | Throughput |
|-------|-------------|----------------|------------|
| 100 | 1ms | 0.003ms | 387K checks/sec |
| 1,000 | 3ms | 0.001ms | 712K checks/sec |  
| 10,000 | 19ms | 0.001ms | 810K checks/sec |
| 50,000 | 79ms | 0.001ms | 910K checks/sec |
| 100,000 | 176ms | 0.001ms | 1.03M checks/sec |

*Benchmarked with realistic organizational hierarchies (8+ levels deep)*

### Performance Notes
- **Linear scaling** with rule count
- **Sub-millisecond** permission checks even with 100K+ rules  
- **Efficient wildcard** pattern matching
- **Fast explanations** (350K+ explanations/second)

## 🔧 API Reference

### `PermissionTree`

#### Constructor
```typescript
new PermissionTree(permissions: string[])
```

#### Methods

**`isAllowed(resourcePath: string, action: string): boolean`**
```typescript
tree.isAllowed("users::123::posts::456", "read") // boolean
```

**`explain(resourcePath: string, action: string): PermissionExplanation`**
```typescript
const explanation = tree.explain("users::123::posts::456", "read")
// Returns detailed explanation object
```

### `explainPermission` Helper
```typescript
import { explainPermission } from "simple-access-control"

explainPermission(tree, "users::123::posts::456", "read")
```

### TypeScript Types

```typescript
interface PermissionExplanation {
  allowed: boolean
  reason: string
  matchedAllowRules: string[]
  matchedDenyRules: string[]  
  path: string[]
  action: string
}
```

## 🏗️ Module Support

Supports both ESM and CommonJS:

```typescript
// ESM
import { PermissionTree } from "simple-access-control"

// CommonJS  
const { PermissionTree } = require("simple-access-control")
```

## 🧪 Testing

Extensively tested with realistic scenarios:

```bash
bun test                    # Run all tests
bun test performance        # Run performance benchmarks
```

## 🤝 Contributing

Contributions welcome! Please read our contributing guide and open an issue or PR.

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Inspiration

This library draws inspiration from:
- **AWS ARN** format for resource identification
- **RBAC/ABAC** patterns for access control
- **Tree-based** data structures for efficient matching

---

**Focus on simplicity. Enjoy great performance.** 🚀
