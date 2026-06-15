import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../../components";
import { Progress } from "../../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  getExperimentById,
  getExperimentModelRatings,
  getExperimentModels,
  getQuestionsByPool,
  getExperimentCategoryRatings,
} from "../../lib/authApi";
import { Loader2 } from "lucide-react";

type SortField = "eloRating" | "winRate";
type SortDirection = "asc" | "desc";

interface LeaderboardEntry {
  id: string;
  modelName: string;
  provider: string;
  eloRating: number;
  winRate: number;
  totalMatchups: number;
}

const TARGET_EXPERIMENT_NAME = "İzmir Yerel Bilgi Benchmark";
const DEFAULT_PUBLIC_EXPERIMENT_ID = "47b627a9-20d3-42ee-b9e3-2864ced04bc0";

export const Leaderboard: React.FC = () => {
  const { experimentId: paramExperimentId } = useParams<{ experimentId?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("eloRating");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [experimentName, setExperimentName] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [categoryEntriesMap, setCategoryEntriesMap] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let expId = paramExperimentId || DEFAULT_PUBLIC_EXPERIMENT_ID;
        const token = localStorage.getItem("bt_access_token");

        if (!paramExperimentId && token) {
          try {
            const { getExperiments } = await import("../../lib/authApi");
            const exps = await getExperiments(token, 0, 100);
            
            const targetExp = exps.find(e => e.name === TARGET_EXPERIMENT_NAME);
            if (targetExp) {
                expId = targetExp.id;
            }
          } catch (err) {
            console.warn("Leaderboard: Could not fetch user-specific experiments, falling back to default public ID.", err);
          }
        }

        const exp = await getExperimentById(expId);
        setExperimentName(exp.name);

        const [ratingsData, modelsData, questionsData, categoryRatingsDataRaw] = await Promise.all([
          getExperimentModelRatings(expId).catch(() => null),
          getExperimentModels(expId).catch(() => []),
          getQuestionsByPool(exp.input_pool_id).catch(() => []),
          getExperimentCategoryRatings(expId).catch(() => null),
        ]);

        const uniqueCategories = Array.from(
          new Set(questionsData.map((q) => q.category).filter((c): c is string => !!c))
        );
        setCategories(uniqueCategories);

        // Normalize raw category data handling object wrappers
        let categoryRatingsData = categoryRatingsDataRaw;
        if (categoryRatingsData && typeof categoryRatingsData === "object" && !Array.isArray(categoryRatingsData)) {
            const arrayValue = Object.values(categoryRatingsData).find((v) => Array.isArray(v));
            categoryRatingsData = arrayValue || categoryRatingsData;
        }

        const buildEntries = (ratingsList: any[]) => {
          return ratingsList.map((row) => {
            const total = row.wins + row.losses + row.draws;
            const winRate = total > 0 ? (row.wins / total) * 100 : 0;
            return {
              id: row.model_id,
              modelName: row.model_name,
              provider: "",
              eloRating: Math.round(row.rating),
              winRate: winRate,
              totalMatchups: total,
            };
          });
        };

        if (ratingsData && ratingsData.model_ratings) {
          setAllEntries(buildEntries(ratingsData.model_ratings));
        }

        if (Array.isArray(categoryRatingsData)) {
          const map: Record<string, LeaderboardEntry[]> = {};
          categoryRatingsData.forEach(catSummary => {
             if (catSummary.category && Array.isArray(catSummary.model_ratings)) {
                 map[catSummary.category] = buildEntries(catSummary.model_ratings);
             }
          });
          setCategoryEntriesMap(map);
        }

      } catch (e) {
        console.error("Failed to load leaderboard data", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const entriesToDisplay = useMemo(() => {
    if (selectedCategory === "all") return allEntries;
    return categoryEntriesMap[selectedCategory] || [];
  }, [selectedCategory, allEntries, categoryEntriesMap]);

  const handleSort = (field: SortField) => {
    const newDirection =
      field === sortField && sortDirection === "desc" ? "asc" : "desc";
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

  const sortedLeaderboard = useMemo(() => {
    return [...entriesToDisplay].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (sortDirection === "desc") {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
  }, [entriesToDisplay, sortField, sortDirection]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Model Leaderboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Rankings based on blind evaluation results using ELO rating system
          </p>
          {experimentName && (
            <h2 className="text-xl font-semibold text-primary mt-2">
              {experimentName}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground whitespace-nowrap">
            Category:
          </label>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card title={`Model Rankings ${selectedCategory !== "all" ? `- ${selectedCategory}` : ""}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>Model Name</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-accent w-32"
                  onClick={() => handleSort("eloRating")}
                >
                  ELO Rating {getSortIcon("eloRating")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-accent w-48"
                  onClick={() => handleSort("winRate")}
                >
                  Win Rate {getSortIcon("winRate")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeaderboard.map((entry, index) => (
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
                    <div className="font-semibold">{entry.eloRating}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium whitespace-nowrap">
                        {entry.winRate.toFixed(1)}%
                      </div>
                      <Progress value={entry.winRate} className="w-16 h-2" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedLeaderboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No models found for this experiment.
                  </TableCell>
                </TableRow>
              )}
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
