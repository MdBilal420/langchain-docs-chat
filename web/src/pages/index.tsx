import * as z from "zod";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton"

import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { ChevronsUpDown } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { PdfPaperNote } from "./api/take_notes";
import { QAResponse } from "./api/qa";

const submitPaperFormSchema = z.object({
  pdfUrl: z.string(),
  name: z.string(),
  pagesToDelete: z.string().optional(),
});

const questionFormSchema = z.object({
  question: z.string(),
});

function processPagesToDelete(pagesToDelete: string): Array<number> {
  const numArr = pagesToDelete.split(",").map((num) => parseInt(num.trim()));
  return numArr;
}

type SubmittedPaperData = {
  pdfUrl: string;
  name: string;
  pagesToDelete?: Array<number>;
};

export default function Home() {

  const [loading,setLoading] = useState<boolean>(false)
  const [submittedPaperData, setSubmittedPaperData] = useState<
    SubmittedPaperData | undefined
  >();
  const [notes, setNotes] = useState<Array<PdfPaperNote> | undefined>();
  const [answers, setAnswers] = useState<Array<QAResponse> | undefined>();
  const submitPaperForm = useForm<z.infer<typeof submitPaperFormSchema>>({
    resolver: zodResolver(submitPaperFormSchema),
  });
  const questionForm = useForm<z.infer<typeof questionFormSchema>>({
    resolver: zodResolver(questionFormSchema),
  });

  async function onPaperSubmit(values: z.infer<typeof submitPaperFormSchema>) {
    setLoading(true)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 890000); // Just under function limit

      const response = await fetch("/api/take_notes", {
        method: "POST",
        body: JSON.stringify(values),
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 504) {
          throw new Error('Request timeout - PDF might be too large or complex');
        }
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while processing the PDF');
    } finally {
      setLoading(false)
    }
  }

  async function onQuestionSubmit(values: z.infer<typeof questionFormSchema>) {
    if (!submittedPaperData) {
      throw new Error("No paper submitted");
    }
    setLoading(true)
    const data = {
      ...values,
      pdfUrl: submittedPaperData.pdfUrl,
    };
    const response = await fetch("/api/qa", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((res) => {
      if (res.ok) {
        return res.json();
      }
      return null;
    });
    if (response) {
      setAnswers(response);
      setLoading(false)
    } else {
      setLoading(false)
      throw new Error("Something went wrong taking notes");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row gap-5 mx-auto mt-3">
        {/** Add paper */}
        <div className="flex flex-col gap-2 border-[1px] border-gray-400 rounded-md p-2">
          <Form {...submitPaperForm}>
            <form
              onSubmit={submitPaperForm.handleSubmit(onPaperSubmit)}
              className="space-y-8"
            >
              <FormField
                control={submitPaperForm.control}
                name="pdfUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paper URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://cds.cern.ch/record/383367/files/p165.pdf"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The URL to the PDF paper you want to submit.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={submitPaperForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>The name of the paper.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <p className="font-normal">Delete pages?</p>
                    <ChevronsUpDown className="h-4 w-4" />
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <FormField
                    control={submitPaperForm.control}
                    name="pagesToDelete"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pages to delete</FormLabel>
                        <FormControl>
                          <Input placeholder="10, 11, 12" {...field} />
                        </FormControl>
                        <FormDescription>
                          The pages to delete from the paper.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        </div>
        {/** QA on paper */}
        <div className="flex flex-col gap-2 border-[1px] border-gray-400 rounded-md p-2">
          <Form {...questionForm}>
            <form
              onSubmit={questionForm.handleSubmit(onQuestionSubmit)}
              className="space-y-8"
            >
              <FormField
                control={questionForm.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Input placeholder="Why is the sky blue" {...field} />
                    </FormControl>
                    <FormDescription>
                      The question to ask about the paper.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        </div>
      </div>
      {loading ? 
        <div  className="flex flex-row gap-5 mx-auto mt-3">
     
      <div className="space-y-2">
        <Skeleton className="h-[125px] w-[650px] rounded-xl" />
        <Skeleton className="h-[125px] w-[650px] rounded-xl" />
        <Skeleton className="h-[125px] w-[650px] rounded-xl" />
      </div>
    
      </div>:
      <div className="flex flex-row gap-5 mx-auto mt-3">
        {notes && notes.length > 0 && (
          <div className="flex flex-col gap-2 max-w-[600px]">
            <h2>Notes</h2>
            <div className="flex flex-col gap-2">
              {notes.map((note, index) => (
                <div className="flex flex-col gap-2 p-2" key={index}>
                  <p>
                    {index + 1}. {note.note}
                  </p>
                  <p className="text-sm text-gray-600">
                    [{note.pageNumbers.join(", ")}]
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {answers && answers.length > 0 && (
          <div className="flex flex-col gap-2 max-w-[600px]">
            <h2>Answers</h2>
            <div className="flex flex-col gap-2">
              {answers.map((answer, index) => (
                <div className="flex flex-col gap-2 p-2" key={index}>
                  <p>
                    {index + 1}. {answer.answer}
                  </p>
                  <p>Followup questions:</p>
                  <div className="flex flex-col gap-2 p-2">
                    {answer.followupQuestions.map((followup, index) => (
                      <p key={index} className="text-sm text-gray-600">
                        {followup}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}
