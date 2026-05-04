import { useState, useRef, useCallback } from "react";

export interface CallState {
  status: "idle" | "incoming" | "calling" | "connected";
  peerId: string | null;
  peerName: string | null;
  offer?: any;
}

export function useWebRTC({
  userId,
  wsSend,
}: {
  userId: string;
  wsSend: (msg: any) => void;
}) {
  const [callState, setCallState] = useState<CallState>({
    status: "idle",
    peerId: null,
    peerName: null,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  // Initialize WebRTC and Local Media
  const initCall = async (targetUserId: string, targetName: string, isInitiator: boolean, offerData?: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStream.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConnection.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Send ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          wsSend({
            type: "ice_candidate",
            to: targetUserId,
            candidate: event.candidate,
          });
        }
      };

      if (isInitiator) {
        // Caller creates offer
        setCallState({ status: "calling", peerId: targetUserId, peerName: targetName });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        wsSend({
          type: "call_offer",
          to: targetUserId,
          offer,
        });
      } else if (offerData) {
        // Callee accepts offer and creates answer
        setCallState({ status: "connected", peerId: targetUserId, peerName: targetName });
        await pc.setRemoteDescription(new RTCSessionDescription(offerData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsSend({
          type: "call_answer",
          to: targetUserId,
          answer,
        });
      }
    } catch (err) {
      console.error("Failed to start call", err);
      endCall();
    }
  };

  // Called by the person initiating the call
  const startCall = (targetUserId: string, targetName: string) => {
    initCall(targetUserId, targetName, true);
  };

  // Called by the person receiving the call when they click Accept
  const acceptCall = () => {
    if (callState.status === "incoming" && callState.peerId && callState.offer) {
      initCall(callState.peerId, callState.peerName || "Unknown", false, callState.offer);
    }
  };

  // Called to reject an incoming call or end an active call
  const endCall = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setCallState({ status: "idle", peerId: null, peerName: null });
  }, []);

  // WebRTC Signaling Handlers (to be called from main WS handler)
  const handleOffer = async (fromId: string, offer: any) => {
    // Only accept if idle
    if (callState.status === "idle") {
      setCallState({
        status: "incoming",
        peerId: fromId,
        peerName: "User " + fromId.substring(0, 4), // Fallback, the UI will map this to real name
        offer,
      });
    }
  };

  const handleAnswer = async (answer: any) => {
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState((prev) => ({ ...prev, status: "connected" }));
    }
  };

  const handleIceCandidate = async (candidate: any) => {
    if (peerConnection.current) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Failed to add ICE candidate", err);
      }
    }
  };

  return {
    callState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    endCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    setCallState, // to update peerName from outside
  };
}
