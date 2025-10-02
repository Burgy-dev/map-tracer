import { useState, useRef } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "./assets/map.png";
import graphData from "./graph.json"; // Load existing graph

function App() {
  const [imgSize, setImgSize] = useState(null);
  const [nodes, setNodes] = useState(graphData.nodes || []); // preload nodes
  const [edges, setEdges] = useState(graphData.edges || []); // preload edges
  const [isGraphing, setIsGraphing] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [history, setHistory] = useState([]);

  const wrapperRef = useRef(null);
  const imgRef = useRef(null);

  const handleImageLoad = (e) => {
    setImgSize({
      w: e.target.naturalWidth,
      h: e.target.naturalHeight,
    });
  };

  // Place nodes with clicks
  const handleMapClick = (e) => {
    if (!isGraphing || !imgRef.current || !imgSize) return;

    const rect = imgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = imgSize.w / rect.width;
    const scaleY = imgSize.h / rect.height;

    const realX = Math.round(clickX * scaleX);
    const realY = Math.round(clickY * scaleY);

    const newNode = { id: `n${nodes.length + 1}`, x: realX, y: realY };
    setNodes((prev) => [...prev, newNode]);
    setHistory((prev) => [...prev, { type: "node", node: newNode }]);
  };

  // Handle connecting nodes
  const handleNodeClick = (node) => {
    if (!selectedNode) {
      setSelectedNode(node);
    } else if (selectedNode.id === node.id) {
      // Deselect if clicking same node
      setSelectedNode(null);
    } else {
      // Connect and reset selection
      const newEdge = { from: selectedNode.id, to: node.id };
      setEdges((prev) => [...prev, newEdge]);
      setHistory((prev) => [...prev, { type: "edge", edge: newEdge }]);
      setSelectedNode(null);
    }
  };

  const saveGraph = () => {
    const graph = { nodes, edges };
    const blob = new Blob([JSON.stringify(graph, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearGraph = () => {
    setNodes([]);
    setEdges([]);
    setHistory([]);
    setSelectedNode(null);
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    if (last.type === "node") {
      setNodes((prev) => prev.filter((n) => n.id !== last.node.id));
      setEdges((prev) =>
        prev.filter((e) => e.from !== last.node.id && e.to !== last.node.id)
      );
    } else if (last.type === "edge") {
      setEdges((prev) =>
        prev.filter(
          (e) => !(e.from === last.edge.from && e.to === last.edge.to)
        )
      );
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
          background: "rgba(0,0,0,0.6)",
          padding: "8px 12px",
          borderRadius: "8px",
          color: "white",
          fontFamily: "sans-serif",
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          onClick={() => setIsGraphing((p) => !p)}
          style={{
            background: isGraphing ? "red" : "green",
            color: "white",
            padding: "6px 10px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {isGraphing ? "Stop Placing Nodes" : "Start Placing Nodes"}
        </button>

        <button
          onClick={undo}
          style={{
            background: "orange",
            color: "white",
            padding: "6px 10px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Undo
        </button>

        <button
          onClick={saveGraph}
          style={{
            background: "blue",
            color: "white",
            padding: "6px 10px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Download Graph JSON
        </button>

        <button
          onClick={clearGraph}
          style={{
            background: "gray",
            color: "white",
            padding: "6px 10px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      {/* Pan & Zoom */}
      <TransformWrapper
        ref={wrapperRef}
        minScale={0.2}
        maxScale={6}
        limitToBounds={false}
        doubleClick={{ disabled: true }} // disable double click zoom
      >
        <TransformComponent>
          <div
            style={{ position: "relative", width: "fit-content" }}
            onClick={handleMapClick}
          >
            <img
              ref={imgRef}
              src={mapImage}
              alt="Map"
              onLoad={handleImageLoad}
              style={{
                display: "block",
                maxWidth: "none",
                maxHeight: "none",
              }}
            />

            {/* Edges */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: imgSize ? `${imgSize.w}px` : "0px",
                height: imgSize ? `${imgSize.h}px` : "0px",
                pointerEvents: "none",
              }}
              viewBox={imgSize ? `0 0 ${imgSize.w} ${imgSize.h}` : undefined}
              preserveAspectRatio="none"
            >
              {edges.map((edge, i) => {
                const from = nodes.find((n) => n.id === edge.from);
                const to = nodes.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="deepskyblue"
                    strokeWidth={4}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((n) => {
              const isSelected = selectedNode?.id === n.id;
              return (
                <div
                  key={n.id}
                  style={{
                    position: "absolute",
                    left: `${n.x}px`,
                    top: `${n.y}px`,
                    transform: "translate(-50%, -50%)",
                    width: isSelected ? "16px" : "12px",
                    height: isSelected ? "16px" : "12px",
                    borderRadius: "50%",
                    background: isSelected ? "orange" : "deepskyblue",
                    border: "2px solid white",
                    boxShadow: "0 0 0 1px black",
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(n);
                  }}
                  title={n.id}
                />
              );
            })}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

export default App;
