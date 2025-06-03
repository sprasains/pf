import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, { addEdge, applyNodeChanges, applyEdgeChanges, Node, Edge, OnNodesChange, OnEdgesChange, OnConnect, ReactFlowInstance } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import NodeEditorModal from '../workflow/NodeEditorModal';

import 'reactflow/dist/style.css';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const WorkflowBuilder = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance!.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: uuidv4(), // Generate a unique ID
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedNode(null);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar Node Palette */}
      <div className="w-64 bg-gray-100 p-4">
        <h2 className="text-lg font-semibold mb-4">Nodes</h2>
        <div
          className="draggable-node mb-2 p-2 bg-white border border-gray-300 rounded cursor-grab"
          onDragStart={(event) => onDragStart(event, 'Slack')}
          draggable
        >
          Slack Node
        </div>
        <div
          className="draggable-node mb-2 p-2 bg-white border border-gray-300 rounded cursor-grab"
          onDragStart={(event) => onDragStart(event, 'Email')}
          draggable
        >
          Email Node
        </div>
        <div
          className="draggable-node mb-2 p-2 bg-white border border-gray-300 rounded cursor-grab"
          onDragStart={(event) => onDragStart(event, 'Sheets')}
          draggable
        >
          Sheets Node
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-grow h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          fitView
        >
          {/* Add controls or other elements here if needed */}
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeEditorModal
          open={isModalOpen}
          onClose={handleModalClose}
          nodeType={selectedNode.type!}
          // Pass other node data as needed
        />
      )}
    </div>
  );
};

export default WorkflowBuilder; 