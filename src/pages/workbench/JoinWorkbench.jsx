import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collaborationService } from "../../services/collaborationService";
import { toast } from "react-hot-toast";

export default function JoinWorkbench() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Joining Workbench...");
  
  useEffect(() => {
    const join = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("Invalid invite link. No token found.");
        return;
      }
      
      try {
        await collaborationService.joinWorkbench(token);
        toast.success("Successfully joined workbench!");
        navigate("/dashboard/workbenches");
      } catch (err) {
        setStatus(err.message || "Failed to join workbench. The link may have expired or is invalid.");
        toast.error("Failed to join workbench");
      }
    };
    
    join();
  }, [searchParams, navigate]);

  return (
    <div className="h-full flex items-center justify-center bg-[#0A0A0A] font-dm-sans">
      <div className="bg-[#181818] p-8 rounded-xl border border-white/10 text-center max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-4">Workbench Invite</h2>
        <p className="text-gray-400">{status}</p>
      </div>
    </div>
  );
}
