import { describe, it, expect, beforeAll } from "vitest"
import { PermissionTree } from "../src"

describe("Performance Tests", () => {
  let smallTree: PermissionTree
  let mediumTree: PermissionTree
  let largeTree: PermissionTree
  let veryLargeTree: PermissionTree

  // Helper function to generate realistic hierarchical permission rules
  function generatePermissions(count: number): string[] {
    const permissions: string[] = []
    const actions = ["read", "write", "delete", "admin", "manage", "view", "edit", "create"]
    
    // Realistic organizational hierarchy structure
    const orgs = ["acme-corp", "tech-startup", "enterprise-co", "global-inc", "startup-ltd"]
    const departments = ["engineering", "marketing", "sales", "hr", "finance", "legal", "ops"]
    const teams = ["backend", "frontend", "devops", "data", "security", "mobile", "qa"]
    const resources = ["projects", "repositories", "documents", "reports", "databases", "servers", "apis"]
    const subResources = ["code", "configs", "secrets", "logs", "metrics", "backups", "deployments"]
    
    for (let i = 0; i < count; i++) {
      const org = orgs[i % orgs.length]
      const dept = departments[Math.floor(i / orgs.length) % departments.length]
      const team = teams[Math.floor(i / (orgs.length * departments.length)) % teams.length]
      const resource = resources[i % resources.length]
      const subResource = subResources[i % subResources.length]
      const resourceId = Math.floor(i / 50) + 1000
      const action = actions[i % actions.length]
      
      // Create realistic nested hierarchies with different patterns
      if (i % 20 === 0) {
        // Org-level *** wildcards (broad permissions)
        permissions.push(`${org}::***;;${action}`)
      } else if (i % 15 === 0) {
        // Department-level *** wildcards
        permissions.push(`${org}::${dept}::***;;${action}`)
      } else if (i % 12 === 0) {
        // Team-level * wildcards
        permissions.push(`${org}::${dept}::${team}::${resource}::*;;${action}`)
      } else if (i % 8 === 0) {
        // Resource-level * wildcards  
        permissions.push(`${org}::${dept}::${team}::${resource}::${resourceId}::*;;${action}`)
      } else if (i % 6 === 0) {
        // Specific deny rules (security restrictions)
        permissions.push(`!${org}::${dept}::${team}::${resource}::${resourceId}::${subResource};;${action}`)
      } else if (i % 4 === 0) {
        // Cross-team permissions (common in real orgs)
        const otherTeam = teams[(Math.floor(i / teams.length) + 1) % teams.length]
        permissions.push(`${org}::${dept}::${otherTeam}::${resource}::${resourceId}::${subResource};;${action}`)
      } else {
        // Specific detailed permissions (most common)
        permissions.push(`${org}::${dept}::${team}::${resource}::${resourceId}::${subResource};;${action}`)
      }
    }
    
    return permissions
  }

  // Helper function to generate realistic test queries
  function generateTestQueries(count: number): Array<{resource: string, action: string}> {
    const queries: Array<{resource: string, action: string}> = []
    const actions = ["read", "write", "delete", "admin", "manage", "view", "edit", "create"]
    
    // Same organizational structure as permissions
    const orgs = ["acme-corp", "tech-startup", "enterprise-co", "global-inc", "startup-ltd"]
    const departments = ["engineering", "marketing", "sales", "hr", "finance", "legal", "ops"]
    const teams = ["backend", "frontend", "devops", "data", "security", "mobile", "qa"]
    const resources = ["projects", "repositories", "documents", "reports", "databases", "servers", "apis"]
    const subResources = ["code", "configs", "secrets", "logs", "metrics", "backups", "deployments"]
    
    for (let i = 0; i < count; i++) {
      // Generate realistic queries that would actually be checked in a real system
      const org = orgs[Math.floor(Math.random() * orgs.length)]
      const dept = departments[Math.floor(Math.random() * departments.length)]
      const team = teams[Math.floor(Math.random() * teams.length)]
      const resource = resources[Math.floor(Math.random() * resources.length)]
      const subResource = subResources[Math.floor(Math.random() * subResources.length)]
      const resourceId = Math.floor(Math.random() * 100) + 1000 // Realistic ID range
      const action = actions[Math.floor(Math.random() * actions.length)]
      
      // Create various depth queries to test different traversal paths
      if (i % 10 === 0) {
        // Shallow org-level queries
        queries.push({
          resource: `${org}`,
          action
        })
      } else if (i % 8 === 0) {
        // Department-level queries
        queries.push({
          resource: `${org}::${dept}`,
          action
        })
      } else if (i % 6 === 0) {
        // Team-level queries
        queries.push({
          resource: `${org}::${dept}::${team}`,
          action
        })
      } else if (i % 4 === 0) {
        // Resource-level queries (4 levels deep)
        queries.push({
          resource: `${org}::${dept}::${team}::${resource}`,
          action
        })
      } else if (i % 3 === 0) {
        // Resource instance queries (5 levels deep)
        queries.push({
          resource: `${org}::${dept}::${team}::${resource}::${resourceId}`,
          action
        })
      } else {
        // Full depth queries (6 levels deep) - most common in real systems
        queries.push({
          resource: `${org}::${dept}::${team}::${resource}::${resourceId}::${subResource}`,
          action
        })
      }
    }
    
    return queries
  }

  beforeAll(() => {
    console.log("🏗️  Setting up performance test trees...")
    
    // Small tree: 100 permissions
    const smallPermissions = generatePermissions(100)
    smallTree = new PermissionTree(smallPermissions)
    
    // Medium tree: 1,000 permissions
    const mediumPermissions = generatePermissions(1000)
    mediumTree = new PermissionTree(mediumPermissions)
    
    // Large tree: 10,000 permissions
    const largePermissions = generatePermissions(10000)
    largeTree = new PermissionTree(largePermissions)
    
    // Very large tree: 50,000 permissions
    const veryLargePermissions = generatePermissions(50000)
    veryLargeTree = new PermissionTree(veryLargePermissions)
    
    console.log("✅ Performance test setup complete!")
  })

  describe("Tree Construction Performance", () => {
    it("should construct small tree (100 permissions) quickly", () => {
      const start = performance.now()
      const permissions = generatePermissions(100)
      new PermissionTree(permissions)
      const end = performance.now()
      
      const constructionTime = end - start
      console.log(`🏗️  Small tree construction: ${constructionTime.toFixed(2)}ms`)
      expect(constructionTime).toBeLessThan(50) // Should be under 50ms
    })

    it("should construct medium tree (1,000 permissions) efficiently", () => {
      const start = performance.now()
      const permissions = generatePermissions(1000)
      new PermissionTree(permissions)
      const end = performance.now()
      
      const constructionTime = end - start
      console.log(`🏗️  Medium tree construction: ${constructionTime.toFixed(2)}ms`)
      expect(constructionTime).toBeLessThan(200) // Should be under 200ms
    })

    it("should construct large tree (10,000 permissions) reasonably fast", () => {
      const start = performance.now()
      const permissions = generatePermissions(10000)
      new PermissionTree(permissions)
      const end = performance.now()
      
      const constructionTime = end - start
      console.log(`🏗️  Large tree construction: ${constructionTime.toFixed(2)}ms`)
      expect(constructionTime).toBeLessThan(1000) // Should be under 1 second
    })
  })

  describe("Permission Check Performance", () => {
    it("should perform fast permission checks on small tree", () => {
      const queries = generateTestQueries(1000)
      
      const start = performance.now()
      for (const query of queries) {
        smallTree.isAllowed(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`⚡ Small tree: ${queries.length} checks in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per check)`)
      expect(avgTime).toBeLessThan(1) // Should be under 1ms per check
    })

    it("should perform efficient permission checks on medium tree", () => {
      const queries = generateTestQueries(1000)
      
      const start = performance.now()
      for (const query of queries) {
        mediumTree.isAllowed(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`⚡ Medium tree: ${queries.length} checks in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per check)`)
      expect(avgTime).toBeLessThan(2) // Should be under 2ms per check
    })

    it("should handle permission checks on large tree", () => {
      const queries = generateTestQueries(1000)
      
      const start = performance.now()
      for (const query of queries) {
        largeTree.isAllowed(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`⚡ Large tree: ${queries.length} checks in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per check)`)
      expect(avgTime).toBeLessThan(5) // Should be under 5ms per check
    })

    it("should scale reasonably on very large tree", () => {
      const queries = generateTestQueries(500) // Fewer queries for very large tree
      
      const start = performance.now()
      for (const query of queries) {
        veryLargeTree.isAllowed(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`⚡ Very large tree: ${queries.length} checks in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per check)`)
      expect(avgTime).toBeLessThan(10) // Should be under 10ms per check
    })
  })

  describe("Explanation Performance", () => {
    it("should perform fast explanations on small tree", () => {
      const queries = generateTestQueries(100)
      
      const start = performance.now()
      for (const query of queries) {
        smallTree.explain(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`📝 Small tree explanations: ${queries.length} in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per explanation)`)
      expect(avgTime).toBeLessThan(5) // Should be under 5ms per explanation
    })

    it("should handle explanations efficiently on medium tree", () => {
      const queries = generateTestQueries(100)
      
      const start = performance.now()
      for (const query of queries) {
        mediumTree.explain(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`📝 Medium tree explanations: ${queries.length} in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per explanation)`)
      expect(avgTime).toBeLessThan(10) // Should be under 10ms per explanation
    })

    it("should provide explanations reasonably fast on large tree", () => {
      const queries = generateTestQueries(50) // Fewer queries for large tree explanations
      
      const start = performance.now()
      for (const query of queries) {
        largeTree.explain(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`📝 Large tree explanations: ${queries.length} in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per explanation)`)
      expect(avgTime).toBeLessThan(20) // Should be under 20ms per explanation
    })
  })

  describe("Wildcard Pattern Performance", () => {
    it("should handle * wildcards efficiently", () => {
      // Create tree with many wildcard patterns
      const wildcardPermissions = []
      for (let i = 0; i < 1000; i++) {
        wildcardPermissions.push(`resource${i % 10}::*::subresource${i % 5};;read`)
      }
      const wildcardTree = new PermissionTree(wildcardPermissions)
      
      const queries = generateTestQueries(500)
      const start = performance.now()
      for (const query of queries) {
        wildcardTree.isAllowed(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`🌟 Wildcard (*) performance: ${queries.length} checks in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per check)`)
      expect(avgTime).toBeLessThan(3)
    })

    it("should handle *** wildcards efficiently", () => {
      // Create tree with many *** wildcard patterns
      const tripleWildcardPermissions = []
      for (let i = 0; i < 1000; i++) {
        tripleWildcardPermissions.push(`resource${i % 10}::${i % 20}::***;;read`)
      }
      const tripleWildcardTree = new PermissionTree(tripleWildcardPermissions)
      
      const queries = generateTestQueries(500)
      const start = performance.now()
      for (const query of queries) {
        tripleWildcardTree.isAllowed(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`🌟 Triple wildcard (***) performance: ${queries.length} checks in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per check)`)
      expect(avgTime).toBeLessThan(3)
    })
  })

  describe("Memory and Scale Tests", () => {
    it("should handle realistic deep organizational hierarchies efficiently", () => {
      // Create realistic deep organizational structure
      const deepPermissions = []
      const orgs = ["corp-a", "corp-b", "corp-c"]
      const regions = ["us-east", "us-west", "eu-central", "ap-south"]
      const departments = ["engineering", "marketing", "sales"]
      const teams = ["team-alpha", "team-beta", "team-gamma"]
      const projects = ["project-1", "project-2", "project-3"]
      const environments = ["prod", "staging", "dev"]
      const resources = ["database", "api", "frontend", "mobile"]
      
      // Generate deep nested permissions (8 levels deep)
      for (const org of orgs) {
        for (const region of regions) {
          for (const dept of departments) {
            for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
              const team = teams[teamIdx]
              for (let projIdx = 0; projIdx < projects.length; projIdx++) {
                const project = projects[projIdx]
                for (const env of environments) {
                  for (const resource of resources) {
                    // Mix of wildcards and specific permissions
                    if (projIdx === 0) {
                      deepPermissions.push(`${org}::${region}::${dept}::${team}::***;;admin`)
                    } else if (teamIdx === 0) {
                      deepPermissions.push(`${org}::${region}::${dept}::***;;manage`)
                    } else {
                      deepPermissions.push(`${org}::${region}::${dept}::${team}::${project}::${env}::${resource};;read`)
                      deepPermissions.push(`${org}::${region}::${dept}::${team}::${project}::${env}::${resource};;write`)
                    }
                    
                    // Add some deny rules for security
                    if (env === "prod" && resource === "database") {
                      deepPermissions.push(`!${org}::${region}::${dept}::${team}::${project}::${env}::${resource};;delete`)
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      console.log(`🏗️  Created ${deepPermissions.length} deep hierarchical permissions`)
      const deepTree = new PermissionTree(deepPermissions)
      
      // Test various depths of queries
      const queries = []
      for (let i = 0; i < 200; i++) {
        const org = orgs[i % orgs.length]
        const region = regions[i % regions.length]
        const dept = departments[i % departments.length]
        const team = teams[i % teams.length]
        const project = projects[i % projects.length]
        const env = environments[i % environments.length]
        const resource = resources[i % resources.length]
        
        if (i % 5 === 0) {
          queries.push({ resource: `${org}::${region}::${dept}::${team}::${project}::${env}::${resource}`, action: "read" })
        } else if (i % 4 === 0) {
          queries.push({ resource: `${org}::${region}::${dept}::${team}::${project}::${env}::${resource}`, action: "write" })
        } else if (i % 3 === 0) {
          queries.push({ resource: `${org}::${region}::${dept}::${team}::${project}::${env}::${resource}`, action: "delete" })
        } else {
          queries.push({ resource: `${org}::${region}::${dept}::${team}::${project}::${env}::${resource}`, action: "admin" })
        }
      }
      
      const start = performance.now()
      let allowed = 0
      for (const query of queries) {
        if (deepTree.isAllowed(query.resource, query.action)) {
          allowed++
        }
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`🏔️  Deep hierarchy performance: ${queries.length} checks in ${totalTime.toFixed(2)}ms`)
      console.log(`🏔️  Average per check: ${avgTime.toFixed(4)}ms (${allowed} allowed, ${queries.length - allowed} denied)`)
      expect(avgTime).toBeLessThan(5) // Should be under 5ms per check for deep hierarchies
    })

    it("should handle mixed allow/deny rules efficiently", () => {
      const mixedPermissions = []
      for (let i = 0; i < 2000; i++) {
        if (i % 3 === 0) {
          mixedPermissions.push(`!resource${i % 50}::${i % 100};;read`) // Deny rule
        } else {
          mixedPermissions.push(`resource${i % 50}::${i % 100};;read`) // Allow rule
        }
      }
      const mixedTree = new PermissionTree(mixedPermissions)
      
      const queries = generateTestQueries(500)
      const start = performance.now()
      for (const query of queries) {
        mixedTree.isAllowed(query.resource, query.action)
      }
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      console.log(`⚖️  Mixed allow/deny performance: ${queries.length} checks in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(3)}ms per check)`)
      expect(avgTime).toBeLessThan(5)
    })
  })

  describe("Stress Tests", () => {
    it("should handle burst of concurrent-like operations", () => {
      const queries = generateTestQueries(5000) // Large burst
      
      const start = performance.now()
      queries.forEach(query => {
        largeTree.isAllowed(query.resource, query.action)
      })
      const end = performance.now()
      
      const totalTime = end - start
      const avgTime = totalTime / queries.length
      const throughput = queries.length / (totalTime / 1000) // operations per second
      
      console.log(`🚀 Burst test: ${queries.length} operations in ${totalTime.toFixed(2)}ms`)
      console.log(`🚀 Throughput: ${throughput.toFixed(0)} operations/second`)
      console.log(`🚀 Average: ${avgTime.toFixed(3)}ms per operation`)
      
      expect(throughput).toBeGreaterThan(1000) // Should handle at least 1000 ops/sec
    })
  })
})