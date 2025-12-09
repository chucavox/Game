import React, { useState, useEffect, useRef } from 'react';
import { LiveService } from '../services/liveService';

interface AICaddyProps {
    className?: string;
}

export const AICaddy: React.FC<AICaddyProps> = ({ className }) => {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const liveServiceRef = useRef<LiveService | null>(null);

    const toggleCaddy = async () => {
        if (isActive) {
            if (liveServiceRef.current) {
                await liveServiceRef.current.disconnect();
                liveServiceRef.current = null;
            }
            setIsActive(false);
        } else {
            setIsConnecting(true);
            try {
                if (!process.env.API_KEY) {
                    alert("No API Key found. Caddy cannot start.");
                    setIsConnecting(false);
                    return;
                }
                const service = new LiveService(process.env.API_KEY);
                liveServiceRef.current = service;
                await service.connect(() => {
                    setIsActive(false);
                });
                setIsActive(true);
            } catch (error) {
                console.error("Failed to connect Caddy", error);
            } finally {
                setIsConnecting(false);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (liveServiceRef.current) {
                liveServiceRef.current.disconnect();
            }
        };
    }, []);

    return (
        <button
            onClick={toggleCaddy}
            disabled={isConnecting}
            className={`
                ${className}
                flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all
                ${isActive 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
                ${isConnecting ? 'opacity-70 cursor-wait' : ''}
            `}
        >
            <span className="text-xl">
                {isActive ? '🎙️' : '🎧'}
            </span>
            <span>
                {isConnecting ? 'Calling Caddy...' : isActive ? 'Caddy Live (Tap to Stop)' : 'Ask AI Caddy'}
            </span>
        </button>
    );
};
