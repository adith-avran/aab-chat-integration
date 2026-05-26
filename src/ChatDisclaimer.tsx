import { useState } from "react";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Alert from "@cloudscape-design/components/alert";
import { Checkbox } from "@cloudscape-design/components";
import FillButton from "./assets/FillButton";
import GradientButton from "./assets/GradientButton";

// const DISCLAIMER_KEY = "chat_disclaimer_accepted";

export default function ChatDisclaimer({
  disclaimerTextFields,
  onAccept,
  onDeny,
}: {
  disclaimerTextFields: {
    cancel: string;
    continue: string;
    header: string;
    gdprConscent: string;
    marketingConscent: string;
    note: string;
    title: string;
  };
  onAccept: () => void;
  onDeny: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const [q1Check, setQ1Check] = useState(false);
  const [q2Check, setQ2Check] = useState(false);

  const handleAccept = () => {
    setVisible(false);
    onAccept();
  };
  const handleDeny = () => {
    setVisible(true);
    onDeny();
  };

  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      onDismiss={handleDeny}
      className="disclaimer-modal"
      header={
        <div>
          <div
            style={{
              textAlign: "center",
              marginBottom: 14,
              fontSize: 22,
              // color: "#ff0000",
            }}
          >
            <span>{disclaimerTextFields.title}</span>
          </div>
          <div>{disclaimerTextFields.header}</div>
        </div>
      }
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <GradientButton onClick={handleDeny}>
              {disclaimerTextFields.cancel}
            </GradientButton>
            <FillButton
              variant="primary"
              disabled={!q1Check}
              onClick={handleAccept}
            >
              {disclaimerTextFields.continue}
            </FillButton>
          </SpaceBetween>
        </Box>
      }
    >
      <div
        style={{ borderTop: "1px solid rgba(85, 85, 85, 0.3)", paddingTop: 16 }}
      >
        <SpaceBetween size="m">
          <SpaceBetween size="s">
            <Checkbox
              onChange={({ detail }) => setQ1Check(detail.checked)}
              checked={q1Check}
            >
              {disclaimerTextFields.gdprConscent}
            </Checkbox>
            <Checkbox
              onChange={({ detail }) => setQ2Check(detail.checked)}
              checked={q2Check}
            >
              {disclaimerTextFields.marketingConscent}
            </Checkbox>
          </SpaceBetween>
          <SpaceBetween size="xs">
            <Alert type="info">{disclaimerTextFields.note}</Alert>
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
