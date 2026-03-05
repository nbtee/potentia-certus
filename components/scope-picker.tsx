'use client';

import { useMemo, useState } from 'react';
import { Building2, ChevronDown, User, UserPlus, Users, Globe, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFilters } from '@/lib/contexts/filter-context';
import { useHierarchyTree, useConsultantMap } from '@/lib/hierarchy/use-hierarchy';
import { buildScopeLabel, type HierarchyNode } from '@/lib/hierarchy/resolve-scope';
import type { ScopePreset, ScopeSelection } from '@/lib/contexts/filter-context';

export function ScopePicker() {
  const { filters, setScope, userHierarchyNodeId } = useFilters();
  const { data: tree = [], isLoading } = useHierarchyTree();
  const { data: consultants = [], isLoading: consultantsLoading } = useConsultantMap();

  const { preset, selectedNodeIds } = filters.scope;
  const [userSearch, setUserSearch] = useState('');

  // Build region → teams structure for the checkbox tree
  const regions = useMemo(() => {
    const regionNodes = tree.filter((n) => n.hierarchy_level === 'region');
    return regionNodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((region) => ({
        ...region,
        teams: tree
          .filter((n) => n.parent_id === region.id && n.hierarchy_level === 'team')
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [tree]);

  // Sorted consultants for user picker
  const sortedConsultants = useMemo(() => {
    return [...consultants]
      .filter((c) => c.display_name)
      .sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''));
  }, [consultants]);

  // Filtered consultants based on search
  const filteredConsultants = useMemo(() => {
    if (!userSearch.trim()) return sortedConsultants;
    const search = userSearch.toLowerCase();
    return sortedConsultants.filter((c) =>
      (c.display_name ?? '').toLowerCase().includes(search)
    );
  }, [sortedConsultants, userSearch]);

  const label = buildScopeLabel(preset, selectedNodeIds, tree, consultants);
  const showTree = preset === 'national' || preset === 'custom';
  const showUsers = preset === 'custom-users';

  const handlePreset = (p: ScopePreset) => {
    setUserSearch('');
    setScope({ preset: p, selectedNodeIds: [] });
  };

  const handleTeamToggle = (teamId: string, checked: boolean) => {
    const newIds = checked
      ? [...selectedNodeIds, teamId]
      : selectedNodeIds.filter((id) => id !== teamId);
    setScope({ preset: 'custom', selectedNodeIds: newIds });
  };

  const handleRegionToggle = (region: HierarchyNode & { teams: HierarchyNode[] }, checked: boolean) => {
    const teamIds = region.teams.map((t) => t.id);
    let newIds: string[];
    if (checked) {
      const existing = new Set(selectedNodeIds);
      teamIds.forEach((id) => existing.add(id));
      newIds = Array.from(existing);
    } else {
      const removeSet = new Set(teamIds);
      newIds = selectedNodeIds.filter((id) => !removeSet.has(id));
    }
    setScope({ preset: 'custom', selectedNodeIds: newIds });
  };

  const handleUserToggle = (userId: string, checked: boolean) => {
    const newIds = checked
      ? [...selectedNodeIds, userId]
      : selectedNodeIds.filter((id) => id !== userId);
    setScope({ preset: 'custom-users', selectedNodeIds: newIds });
  };

  const isRegionChecked = (region: { teams: HierarchyNode[] }) => {
    return region.teams.every((t) => selectedNodeIds.includes(t.id));
  };

  const isRegionIndeterminate = (region: { teams: HierarchyNode[] }) => {
    const checked = region.teams.filter((t) => selectedNodeIds.includes(t.id)).length;
    return checked > 0 && checked < region.teams.length;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-[200px] justify-between border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-gray-500" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] bg-white p-0" align="start">
        {/* Preset buttons */}
        <div className={`flex flex-wrap gap-1 p-3${showTree || showUsers ? ' border-b border-gray-100' : ''}`}>
          <PresetButton
            icon={<User className="h-3.5 w-3.5" />}
            label="Me"
            active={preset === 'self'}
            onClick={() => handlePreset('self')}
          />
          <PresetButton
            icon={<Users className="h-3.5 w-3.5" />}
            label="My Team"
            active={preset === 'my-team'}
            onClick={() => handlePreset('my-team')}
            disabled={!userHierarchyNodeId}
          />
          <PresetButton
            icon={<Globe className="h-3.5 w-3.5" />}
            label="National"
            active={preset === 'national'}
            onClick={() => handlePreset('national')}
          />
          <PresetButton
            icon={<UserPlus className="h-3.5 w-3.5" />}
            label="Users"
            active={preset === 'custom-users'}
            onClick={() => handlePreset('custom-users')}
          />
        </div>

        {/* Checkbox tree — only shown for national/custom presets */}
        {showTree && (
          <div className="max-h-[300px] overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <p className="text-sm text-gray-400">Loading teams...</p>
            ) : (
              regions.map((region) => (
                <div key={region.id}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={isRegionChecked(region)}
                      ref={(el) => {
                        if (el) {
                          (el as unknown as HTMLButtonElement).dataset.state =
                            isRegionIndeterminate(region) ? 'indeterminate' :
                            isRegionChecked(region) ? 'checked' : 'unchecked';
                        }
                      }}
                      onCheckedChange={(checked) =>
                        handleRegionToggle(region, checked === true)
                      }
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {region.name}
                    </span>
                  </label>
                  <div className="ml-6 mt-1.5 space-y-1.5">
                    {region.teams.map((team) => (
                      <label
                        key={team.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedNodeIds.includes(team.id)}
                          onCheckedChange={(checked) =>
                            handleTeamToggle(team.id, checked === true)
                          }
                        />
                        <span className="text-sm text-gray-600">{team.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* User picker — shown for custom-users preset */}
        {showUsers && (
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <div className="max-h-[250px] overflow-y-auto space-y-1">
              {consultantsLoading ? (
                <p className="text-sm text-gray-400">Loading users...</p>
              ) : filteredConsultants.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No users found</p>
              ) : (
                filteredConsultants.map((consultant) => (
                  <label
                    key={consultant.id}
                    className="flex items-center gap-2 cursor-pointer rounded px-1 py-1 hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedNodeIds.includes(consultant.id)}
                      onCheckedChange={(checked) =>
                        handleUserToggle(consultant.id, checked === true)
                      }
                    />
                    <span className="text-sm text-gray-700">{consultant.display_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PresetButton({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {icon}
      {label}
    </button>
  );
}
