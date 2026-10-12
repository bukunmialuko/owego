type TreeNode = { parent: TreeNode | null; props: Record<string, unknown> };

export function ancestorsOf(node: TreeNode): TreeNode[] {
  return node.parent === null ? [] : [node.parent, ...ancestorsOf(node.parent)];
}
