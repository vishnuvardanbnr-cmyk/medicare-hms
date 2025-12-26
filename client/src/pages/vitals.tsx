import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Plus, Heart, Thermometer, Wind, Droplets } from "lucide-react";

export default function VitalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Patient Vitals
          </h1>
          <p className="text-muted-foreground">Record and monitor patient vital signs</p>
        </div>
        <Button data-testid="button-record-vitals">
          <Plus className="w-4 h-4 mr-2" />
          Record Vitals
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Heart className="w-4 h-4" />
              Heart Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">-- bpm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" />
              Blood Pressure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">--/-- mmHg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Thermometer className="w-4 h-4" />
              Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">-- F</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Droplets className="w-4 h-4" />
              SpO2
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">-- %</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Vitals Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Wind className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Search for a patient to view their vitals history</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
