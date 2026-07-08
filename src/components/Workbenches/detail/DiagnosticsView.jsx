import React from "react";
import TradeEngine from "../../../pages/TradeEngine";

export default function DiagnosticsView({ workbenchId }) {
  return (
    <div className="h-full overflow-hidden">
      <TradeEngine workbenchId={workbenchId} />
    </div>
  );
}
