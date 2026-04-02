import { useState } from "react";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Alert from "@cloudscape-design/components/alert";

const DISCLAIMER_KEY = "chat_disclaimer_accepted";

export default function ChatDisclaimer({ onAccept }: { onAccept: () => void }) {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(DISCLAIMER_KEY) !== "true",
  );

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, "true");
    setVisible(false);
    onAccept();
  };

  if (!visible) return null;
  return (
    <Modal
      visible
      className="disclaimer-modal"
      header="Before you begin"
      footer={
        <Box float="right">
          <Button variant="primary" onClick={handleAccept}>
            Ok
          </Button>
        </Box>
      }
    >
      <div style={{ borderTop: "1px solid rgba(85, 85, 85, 0.3)", paddingTop: 16 }}>
        <SpaceBetween size="m">
          <Box>
            By chatting, you agree this chat may be monitored, recorded, and
            used for personalization, analytics, and other business services per
            our Privacy Statement.
          </Box>
          <SpaceBetween size="xs">
            <Alert type="info">
              Note: I am powered by AI. Before using AI results, verify accuracy
              and completeness
            </Alert>
            {/* <Box>
            Conversations may be monitored or recorded for quality assurance and
            compliance purposes.
          </Box> */}
          </SpaceBetween>
        </SpaceBetween>
      </div>
    </Modal>
  );
}
