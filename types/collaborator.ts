export interface Collaborator {
  id: string
  email: string
  displayName: string | null
  imageUrl: string | null
  status: "active" | "invited"
}

export interface ProjectOwner {
  id: string
  email: string | null
  displayName: string | null
  imageUrl: string | null
}
