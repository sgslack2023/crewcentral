import React, { useRef, useState, useEffect } from 'react';
import { Button, Space } from 'antd';
import { ClearOutlined, CheckOutlined } from '@ant-design/icons';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ 
  onSave, 
  onCancel,
  width = 500,
  height = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas on mount/remount
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setIsEmpty(true);
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      if (ctx) {
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        setIsEmpty(false);
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Touch event handlers for touchscreen support
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling while signing
    if (e.touches.length === 0) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      if (ctx) {
        const touch = e.touches[0];
        ctx.beginPath();
        ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    }
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling while signing
    if (!isDrawing || e.touches.length === 0) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      if (ctx) {
        const touch = e.touches[0];
        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        ctx.stroke();
        setIsEmpty(false);
      }
    }
  };

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
      }
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas && !isEmpty) {
      const signatureData = canvas.toDataURL('image/png');
      onSave(signatureData);
    }
  };

  return (
    <div>
      <div style={{
        border: '2px dashed #d9d9d9',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawingTouch}
          onTouchMove={drawTouch}
          onTouchEnd={stopDrawingTouch}
          onTouchCancel={stopDrawingTouch}
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            backgroundColor: '#fff',
            cursor: 'crosshair',
            display: 'block',
            width: '100%',
            touchAction: 'none' // Prevents default touch behaviors like scrolling/zooming
          }}
        />
        <div style={{ 
          textAlign: 'center', 
          marginTop: '8px', 
          fontSize: '12px', 
          color: '#999' 
        }}>
          Sign above using your mouse or touchscreen
        </div>
      </div>

      <Space style={{ width: '100%', justifyContent: 'center' }}>
        <Button onClick={clearSignature} icon={<ClearOutlined />}>
          Clear
        </Button>
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="primary" 
          onClick={saveSignature}
          icon={<CheckOutlined />}
          disabled={isEmpty}
        >
          Save Signature
        </Button>
      </Space>
    </div>
  );
};

export default SignaturePad;
