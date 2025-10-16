import { Settings } from "../../../types/settings";
import SettingsCard from "./settings-card";

interface Props {
  settingsDraft: Settings;
  onSwitchChange: (field: string, checked: boolean) => void;
}

export default function HistoryCard(props: Props) {
  const { settingsDraft, onSwitchChange } = props;

  return (
    <SettingsCard
      title="History"
      helperText="Automatically record all events made in BreakTimer to be viewed in the History Page. Up to 90 days is saved and stored locally."
      toggle={{
        checked: settingsDraft.historyEnabled,
        onCheckedChange: (checked) => onSwitchChange("historyEnabled", checked),
      }}
    >
      <div className="text-sm text-muted-foreground mt-4">
        Data is only stored locally and saved for up to 90 days.
      </div>
    </SettingsCard>
  );
}
