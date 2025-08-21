/**
 * Represents a match result with explanation details.
 */
export interface MatchResult {
  matched: boolean;
  matchedRule?: string;
  matchedSegments?: string[];
}

/**
 * Represents a permission decision explanation.
 */
export interface PermissionExplanation {
  allowed: boolean;
  reason: string;
  matchedAllowRules: string[];
  matchedDenyRules: string[];
  path: string[];
  action: string;
}

/**
 * Represents a node in the permission tree.
 * Used internally to organize segments and actions.
 */
class PermissionNode {
  children: Map<string, PermissionNode> = new Map();
  actions: Set<string> = new Set();

  /**
   * Insert a new permission path and associated action.
   */
  insert(segments: string[], action: string): void {
    if (segments.length === 0) {
      this.actions.add(action);
      return;
    }
    const [head, ...rest] = segments;
    if (!this.children.has(head)) {
      this.children.set(head, new PermissionNode());
    }
    this.children.get(head)!.insert(rest, action);
  }

  /**
   * Recursively checks if the given path and action are matched.
   */
  match(segments: string[], action: string): boolean {
    if (segments.length === 0) {
      return this.actions.has("*") || this.actions.has(action);
    }

    const [head, ...rest] = segments;
    
    // Check for *** wildcard that matches remaining segments
    const tripleWildcardNode = this.children.get("***");
    if (tripleWildcardNode && (tripleWildcardNode.actions.has("*") || tripleWildcardNode.actions.has(action))) {
      return true;
    }
    
    const nextNodes = [this.children.get(head), this.children.get("*")].filter(Boolean) as PermissionNode[];

    return nextNodes.some(node => node.match(rest, action));
  }

  /**
   * Recursively checks if the given path and action are matched, returning detailed match information.
   */
  matchWithDetails(segments: string[], action: string, currentPath: string[] = []): MatchResult[] {
    const results: MatchResult[] = [];
    
    if (segments.length === 0) {
      if (this.actions.has("*")) {
        results.push({
          matched: true,
          matchedRule: currentPath.join("::") + ";;" + "*",
          matchedSegments: [...currentPath]
        });
      }
      if (this.actions.has(action)) {
        results.push({
          matched: true,
          matchedRule: currentPath.join("::") + ";;" + action,
          matchedSegments: [...currentPath]
        });
      }
      return results;
    }

    const [head, ...rest] = segments;
    
    // Check for *** wildcard that matches remaining segments
    const tripleWildcardNode = this.children.get("***");
    if (tripleWildcardNode) {
      const tripleWildcardPath = [...currentPath, "***"];
      if (tripleWildcardNode.actions.has("*")) {
        results.push({
          matched: true,
          matchedRule: tripleWildcardPath.join("::") + ";;" + "*",
          matchedSegments: tripleWildcardPath
        });
      }
      if (tripleWildcardNode.actions.has(action)) {
        results.push({
          matched: true,
          matchedRule: tripleWildcardPath.join("::") + ";;" + action,
          matchedSegments: tripleWildcardPath
        });
      }
    }
    
    // Check exact match
    const exactNode = this.children.get(head);
    if (exactNode) {
      const exactResults = exactNode.matchWithDetails(rest, action, [...currentPath, head]);
      results.push(...exactResults);
    }
    
    // Check wildcard match
    const wildcardNode = this.children.get("*");
    if (wildcardNode) {
      const wildcardResults = wildcardNode.matchWithDetails(rest, action, [...currentPath, "*"]);
      results.push(...wildcardResults);
    }

    return results;
  }
}

/**
 * The main tree that checks permission inclusion and exclusion.
 *
 * @example
 * ```ts
 * const tree = new PermissionTree(["users::123;;read", "!users::123::posts;;read"])
 * tree.isAllowed("users::123", "read") // true
 * tree.isAllowed("users::123::posts", "read") // false
 * ```
 */
export class PermissionTree {
  private allowTree = new PermissionNode();
  private denyTree = new PermissionNode();

  /**
   * Constructs the permission tree from a list of permission strings.
   * @param permissions List of permission strings.
   */
  constructor(permissions: string[]) {
    for (const perm of permissions) {
      const isDenied = perm.startsWith("!");
      const clean = isDenied ? perm.slice(1) : perm;
      const [path, action = "*"] = clean.split(";;");
      const segments = path.split("::");
      const targetTree = isDenied ? this.denyTree : this.allowTree;
      targetTree.insert(segments, action);
    }
  }

  /**
   * Checks whether access is allowed based on provided resource and action.
   * @param resourcePath Resource path in `::` segments.
   * @param action Requested action.
   * @returns True if access is allowed.
   */
  isAllowed(resourcePath: string, action: string): boolean {
    const segments = resourcePath.split("::");
    if (this.denyTree.match(segments, action)) return false;
    return this.allowTree.match(segments, action);
  }

  /**
   * Explains why a permission is allowed or denied.
   * @param resourcePath Resource path in `::` segments.
   * @param action Requested action.
   * @returns Detailed explanation of the permission decision.
   */
  explain(resourcePath: string, action: string): PermissionExplanation {
    const segments = resourcePath.split("::");
    
    // Get all matching allow and deny rules
    const allowMatches = this.allowTree.matchWithDetails(segments, action);
    const denyMatches = this.denyTree.matchWithDetails(segments, action);
    
    const matchedAllowRules = allowMatches
      .filter(m => m.matched)
      .map(m => m.matchedRule!)
      .filter(Boolean);
    
    const matchedDenyRules = denyMatches
      .filter(m => m.matched)
      .map(m => "!" + m.matchedRule!)
      .filter(Boolean);
    
    const hasDenyMatch = denyMatches.some(m => m.matched);
    const hasAllowMatch = allowMatches.some(m => m.matched);
    
    let reason: string;
    let allowed: boolean;
    
    if (hasDenyMatch) {
      allowed = false;
      if (hasAllowMatch) {
        reason = `Access denied by exclusion rule(s): ${matchedDenyRules.join(", ")}. Although allow rule(s) matched: ${matchedAllowRules.join(", ")}, deny rules take precedence.`;
      } else {
        reason = `Access denied by exclusion rule(s): ${matchedDenyRules.join(", ")}.`;
      }
    } else if (hasAllowMatch) {
      allowed = true;
      reason = `Access allowed by rule(s): ${matchedAllowRules.join(", ")}.`;
    } else {
      allowed = false;
      reason = `Access denied: no matching allow rules found for resource "${resourcePath}" and action "${action}".`;
    }
    
    return {
      allowed,
      reason,
      matchedAllowRules,
      matchedDenyRules,
      path: segments,
      action
    };
  }
}

/**
 * Helper function to explain permission decisions for a given tree and permission.
 * @param tree The PermissionTree to evaluate against.
 * @param resourcePath Resource path in `::` segments.
 * @param action Requested action.
 * @returns Detailed explanation of the permission decision.
 */
export function explainPermission(tree: PermissionTree, resourcePath: string, action: string): PermissionExplanation {
  return tree.explain(resourcePath, action);
}
