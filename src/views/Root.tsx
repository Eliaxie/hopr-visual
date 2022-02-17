import React, { FC, useEffect, useState } from "react";
import { SigmaContainer, ZoomControl, FullScreenControl } from "react-sigma-v2";
import { omit, mapValues, keyBy, constant } from "lodash";

import getNodeProgramImage from "sigma/rendering/webgl/programs/node.image";

import GraphSettingsController from "./GraphSettingsController";
import GraphEventsController from "./GraphEventsController";
import GraphDataController from "./GraphDataController";
import DescriptionPanel from "./DescriptionPanel";
import { Dataset, DatasetMap, FiltersState } from "../types";
import ClustersPanel from "./ClustersPanel";
import SearchField from "./SearchField";
import drawLabel from "../canvas-utils";
import GraphTitle from "./GraphTitle";
import TagsPanel from "./TagsPanel";
import eventScanner, { targetABI } from "../event-scanner/event-scanner";

import "react-sigma-v2/lib/react-sigma-v2.css";
import { GrClose } from "react-icons/gr";
import { BiRadioCircleMarked, BiBookContent } from "react-icons/bi";
import { BsArrowsFullscreen, BsFullscreenExit, BsZoomIn, BsZoomOut } from "react-icons/bs";
import { ethers } from "ethers";

const Root: FC = () => {
  const [showContents, setShowContents] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [filtersState, setFiltersState] = useState<FiltersState>({
    clusters: {},
    tags: {},
  });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Load data on mount:
  /*
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/dataset.json`)
      .then((res) => res.json())
      .then((dataset: Dataset) => {
        setDataset(dataset);
        setFiltersState({
          clusters: mapValues(keyBy(dataset.clusters, "key"), constant(true)),
          tags: mapValues(keyBy(dataset.tags, "key"), constant(true)),
        });
        requestAnimationFrame(() => setDataReady(true));
      });
  }, []);
  */

  function addEdge(node1: string, node2: string, dataset: DatasetMap): DatasetMap{
    let adjacentNodes = dataset.edges.get(node1)
    if(adjacentNodes === undefined){
      dataset.edges.set(node1, [node2])
    } else {
      dataset.edges.set(node1, adjacentNodes.concat(node2))
    }
    return dataset
  }

  function removeEdge(node1: string, node2: string, dataset: DatasetMap): DatasetMap{
    let adjacentNodes = dataset.edges.get(node1)
    if(adjacentNodes === undefined) throw Error("Tring to delete a non-existent edge!")
    let node2index = adjacentNodes.findIndex((x) => x === node2)
    if(node2index === undefined){
      throw Error("Tring to delete a non-existent edge!")
    }
    let adjacentNodesTemp = adjacentNodes.splice(node2index, 1)
    if(adjacentNodesTemp.length === 0){
      dataset.edges.delete(node1)
    } else {
      dataset.edges.set(node1, adjacentNodesTemp)
    }
    return dataset
  }

  function datasetBuilder(newEvent: ethers.Event, dataset: DatasetMap): DatasetMap{
    let iface = new ethers.utils.Interface(targetABI);
    let parsedEvent = iface.parseLog(newEvent)
    if(newEvent.args == null) return dataset;
    try{
    switch(newEvent.args[2][4]){
      case 2:{
        let startingNode = newEvent.args[0]
        let arrivingNode = newEvent.args[1]
        dataset = addEdge(startingNode, arrivingNode, dataset);
        dataset = addEdge(arrivingNode, startingNode, dataset);
      }
      break;
      case 0:{
        let startingNode = newEvent.args[0]
        let arrivingNode = newEvent.args[1]
        dataset = removeEdge(startingNode, arrivingNode, dataset)
        dataset = removeEdge(arrivingNode, startingNode, dataset)        
      }
      break;
      default: 
      break;
    } 
    } catch(err){
      console.error(err)
    }
    return dataset;
  }

  function datasetJsonify(dataset: DatasetMap): Dataset{
    throw new Error("Not implemented yet")
  }

  useEffect(() => {
    let datasetMap: DatasetMap = {
      clusters: [],
      tags: [],
      edges: new Map()
    }
    let dataset: Dataset
    console.log("importing data")
    let data:ethers.Event[] = require('../data/rawdata.json');
    console.log("started database build")
    data.forEach(element => {
      datasetMap = datasetBuilder(element, datasetMap)
    });
    console.log(datasetMap)
    setDataset(datasetJsonify(datasetMap))
    requestAnimationFrame(() => setDataReady(true));
  }, [])

  if (!dataset) return null;

  return (
    <div id="app-root" className={showContents ? "show-contents" : ""}>
      <SigmaContainer
        graphOptions={{ type: "directed" }}
        initialSettings={{
          nodeProgramClasses: { image: getNodeProgramImage() },
          labelRenderer: drawLabel,
          defaultNodeType: "image",
          defaultEdgeType: "arrow",
          labelDensity: 0.07,
          labelGridCellSize: 60,
          labelRenderedSizeThreshold: 15,
          labelFont: "Lato, sans-serif",
          zIndex: true,
        }}
        className="react-sigma"
      >
        <GraphSettingsController hoveredNode={hoveredNode} />
        <GraphEventsController setHoveredNode={setHoveredNode} />
        <GraphDataController dataset={dataset} filters={filtersState} />
        {!dataReady && (<>Loading data...</>)}
        {dataReady && (
          <>
            <div className="controls">
              <div className="ico">
                <button
                  type="button"
                  className="show-contents"
                  onClick={() => setShowContents(true)}
                  title="Show caption and description"
                >
                  <BiBookContent />
                </button>
              </div>
              <FullScreenControl
                className="ico"
                customEnterFullScreen={<BsArrowsFullscreen />}
                customExitFullScreen={<BsFullscreenExit />}
              />
              <ZoomControl
                className="ico"
                customZoomIn={<BsZoomIn />}
                customZoomOut={<BsZoomOut />}
                customZoomCenter={<BiRadioCircleMarked />}
              />
            </div>
            <div className="contents">
              <div className="ico">
                <button
                  type="button"
                  className="ico hide-contents"
                  onClick={() => setShowContents(false)}
                  title="Show caption and description"
                >
                  <GrClose />
                </button>
              </div>
              <GraphTitle filters={filtersState} />
              <div className="panels">
                <SearchField filters={filtersState} />
                <DescriptionPanel />
                <ClustersPanel
                  clusters={dataset.clusters}
                  filters={filtersState}
                  setClusters={(clusters) =>
                    setFiltersState((filters) => ({
                      ...filters,
                      clusters,
                    }))
                  }
                  toggleCluster={(cluster) => {
                    setFiltersState((filters) => ({
                      ...filters,
                      clusters: filters.clusters[cluster]
                        ? omit(filters.clusters, cluster)
                        : { ...filters.clusters, [cluster]: true },
                    }));
                  }}
                />
                <TagsPanel
                  tags={dataset.tags}
                  filters={filtersState}
                  setTags={(tags) =>
                    setFiltersState((filters) => ({
                      ...filters,
                      tags,
                    }))
                  }
                  toggleTag={(tag) => {
                    setFiltersState((filters) => ({
                      ...filters,
                      tags: filters.tags[tag] ? omit(filters.tags, tag) : { ...filters.tags, [tag]: true },
                    }));
                  }}
                />
              </div>
            </div>
          </>
        )}
      </SigmaContainer>
    </div>
  );
};

export default Root;
