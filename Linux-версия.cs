//Part__2

using System;
using System.IO;
using System.Net;
using System.Collections.Generic;
using System.Collections.ObjectModel;

class Programma
{
    class DeleteInTempFile //~TempFile: IDisposable
    {
        static void AppInLinux(string[] args)
        {
            //Дата, время
            var _now = DateTime.Now;

            //paths to ~TempFile
            var temp_Folder = Path.GetTempPath();   //Тут путь к временным файлам, соответствующий правилам написания и расположения в Linux os

            //Удаляем всё, что старше 48 часов
            foreach (var FilePath in Directory.GetFiles(temp_Folder))
            {
                var __FI__ = new FileInfo(FilePath);

                if (__FI__.CreationTime < _now.AddDays(-2))
                {
                    try
                    {
                        __FI__.Delete();
                        Console.WriteLine($"{FilePath} был удалён");
                    }
                    catch (Exception ex)
                    {
                        //pass
                    }
                }
            }
        }
    }
}