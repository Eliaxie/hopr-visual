import { ethers } from "ethers";

export interface NodeData {
  key: string;
  label: string;
  tag: string;
  URL: string;
  cluster: string;
  x: number;
  y: number;
  score: number
}

export interface Cluster {
  key: string;
  color: string;
  clusterLabel: string;
}

export interface Tag {
  key: string;
  image: string;
}

export interface Dataset {
  nodes: NodeData[];
  edges: [string, NodeWithStats][];
  clusters: Cluster[];
  tags: Tag[];
}

export interface FiltersState {
  clusters: Record<string, boolean>;
  tags: Record<string, boolean>;
}

export interface NodeWithStats {
  node: string,
  stats: string
}

export interface DatasetMap {
  edges: Map<string, NodeWithStats[]>
  clusters: Cluster[];
  tags: Tag[];
}
