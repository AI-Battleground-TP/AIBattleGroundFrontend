import React, { useState } from "react";
import { Card } from "../../components";
import { Progress } from "../../components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { dummyLeaderboard } from "../../utils/dummyData";
import type { LeaderboardEntry } from "../../types";

type SortField = "eloRating" | "winRate" | "avgResponseTime" | "totalVotes";
type SortDirection = "asc" | "desc";

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] =
    useState<LeaderboardEntry[]>(dummyLeaderboard);
  const [sortField, setSortField] = useState<SortField>("eloRating");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    const newDirection =
      field === sortField && sortDirection === "desc" ? "asc" : "desc";

    const sorted = [...leaderboard].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      if (newDirection === "desc") {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    setLeaderboard(sorted);
    setSortField(field);
    setSortDirection(newDirection);
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return "↕️";
    return sortDirection === "desc" ? "↓" : "↑";
  };

  const getRankColor = (index: number) => {
    if (index === 0) return "text-primary"; // Gold
    if (index === 1) return "text-muted-foreground/50"; // Silver
    if (index === 2) return "text-accent-foreground"; // Bronze
    return "text-muted-foreground";
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Model Leaderboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Rankings based on blind evaluation results using ELO rating system
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Models</p>
            <p className="text-3xl font-bold text-primary">
              {leaderboard.length}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Top Model</p>
            <p className="text-lg font-bold text-primary">
              {leaderboard[0]?.modelName}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Evaluations</p>
            <p className="text-3xl font-bold text-primary">
              {leaderboard.reduce((sum, entry) => sum + entry.totalVotes, 0)}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Avg Win Rate</p>
            <p className="text-3xl font-bold text-accent-foreground">
              {(
                leaderboard.reduce((sum, entry) => sum + entry.winRate, 0) /
                leaderboard.length
              ).toFixed(1)}
              %
            </p>
          </div>
        </Card>
      </div>

      <Card title="Model Rankings">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>Model Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleSort("eloRating")}
                >
                  ELO Rating {getSortIcon("eloRating")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleSort("winRate")}
                >
                  Win Rate {getSortIcon("winRate")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleSort("avgResponseTime")}
                >
                  Avg Response Time {getSortIcon("avgResponseTime")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleSort("totalVotes")}
                >
                  Total Votes {getSortIcon("totalVotes")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, index) => (
                <TableRow
                  key={entry.id}
                  className={index < 3 ? "bg-primary/10" : ""}
                >
                  <TableCell>
                    <span
                      className={`text-2xl font-bold ${getRankColor(index)}`}
                    >
                      {getRankIcon(index)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.modelName}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {entry.provider}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{entry.eloRating}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">
                        {entry.winRate.toFixed(1)}%
                      </div>
                      <Progress value={entry.winRate} className="w-16 h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.avgResponseTime.toFixed(1)}s
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {entry.totalVotes}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="bg-muted/30 border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">
          About ELO Rating
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The ELO rating system is a method for calculating the relative skill
          levels of models in head-to-head comparisons. Models start with a base
          rating and gain or lose points based on evaluation outcomes. A higher
          ELO rating indicates better performance according to judge
          preferences. This system accounts for the strength of opponents,
          making it a robust metric for ranking.
        </p>
      </div>
    </div>
  );
};
