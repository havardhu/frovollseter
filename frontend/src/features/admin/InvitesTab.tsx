import type { AdminUser, AdminAssociation, CurrentUser } from "@/api/types";
import { InviteForm } from "./InviteForm";
import { MassInviteForm } from "./MassInviteForm";

interface Props {
  currentUser: CurrentUser;
  associations: AdminAssociation[];
  onUserInvited: (user: AdminUser) => void;
}

export function InvitesTab({ currentUser, associations, onUserInvited }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <InviteForm
        currentUserRole={currentUser.role}
        associations={associations}
        onUserInvited={onUserInvited}
      />

      <MassInviteForm
        currentUserRole={currentUser.role}
        associations={associations}
      />
    </div>
  );
}
